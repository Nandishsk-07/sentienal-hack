import os
import json
import asyncio
import httpx
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any

router = APIRouter()

class ChatRequest(BaseModel):
    messages: List[Dict[str, Any]]
    context: Dict[str, Any] = None

async def simulate_claude_response(messages, context):
    """Fallback generator if no ANTHROPIC_API_KEY is specified in environment."""
    prompt = messages[-1]["content"] if messages else ""
    
    response_text = f"**[SENTINEL AI - DEMO MODE]**\nI've processed your query about the alerts: '{prompt}'.\n\n"
    
    if context and "risk_score" in context:
        response_text += f"> Context Loaded: Subject risk score is **{context['risk_score']}**.\n\n"
        
    if context and "flags" in context:
        response_text += f"I see the following active flags: {', '.join(context['flags'])}.\n\n"
        
    response_text += "Based on correlation with our Isolation Forest baseline, this is highly indicative of an **insider threat** scenario, potentially credential harvesting or bulk exfiltration. I recommend placing an immediate temporary lock on the account while performing a human review."
    
    words = response_text.split(" ")
    
    # Send start event
    yield f"data: {json.dumps({'type': 'message_start'})}\n\n"
    
    # Simulate Server-Sent Events (SSE) stream typing delay
    for word in words:
        await asyncio.sleep(0.04)
        chunk = {
            "type": "content_block_delta",
            "delta": {"type": "text_delta", "text": word + " "}
        }
        yield f"data: {json.dumps(chunk)}\n\n"
        
    # Send stop event
    yield f"data: {json.dumps({'type': 'message_stop'})}\n\n"

async def call_anthropic_stream(messages, context):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    
    if not api_key:
        # Fallback to simulation gracefully
        async for chunk in simulate_claude_response(messages, context):
            yield chunk
        return
        
    system_prompt = "You are SENTINEL AI, a fraud investigation assistant for a bank. Be concise, analytical, and professional. Help investigators understand anomalies, suggest next steps, and explain risk factors."
    
    if context:
        system_prompt += f"\n\nCURRENT DASHBOARD CONTEXT:\n{json.dumps(context, indent=2)}"
        
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    
    payload = {
        "model": "claude-3-5-sonnet-20240620",
        "max_tokens": 1024,
        "system": system_prompt,
        "messages": messages,
        "stream": True
    }
    
    async with httpx.AsyncClient() as client:
        try:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    error_msg = await response.aread()
                    yield f"data: {json.dumps({'type': 'error', 'error': {'message': f'API Error {response.status_code}'}})}\n\n"
                    return
                    
                async for line in response.aiter_lines():
                    if line:
                        yield f"{line}\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': {'message': str(e)}})}\n\n"
                    
@router.post("")
async def chat_endpoint(request: ChatRequest):
    """
    Proxies AI chats to Anthropic to avoid exposing the API key to the frontend.
    Returns a Server-Sent Events (SSE) StreamingResponse.
    """
    return StreamingResponse(
        call_anthropic_stream(request.messages, request.context),
        media_type="text/event-stream"
    )
