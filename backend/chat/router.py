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
    
    response_text = f"**[SENTINEL AI - DEMO MODE]**\n"
    
    if "export" in prompt.lower() or "excel" in prompt.lower():
        response_text += "I am preparing the requested fraud data for export. Please find the generated file below.\n\n"
        
        # Mock data for export
        export_data = []
        if context and "users" in context:
            export_data = context["users"]
            
        response_text += f"EXPORT_EXCEL: {json.dumps(export_data)}"
    else:
        if "summary" in prompt.lower() or "list" in prompt.lower() or "users" in prompt.lower():
            response_text += "Here is the summary of the requested users based on current system data:\n\n"
            if context and "users" in context:
                # Use only 3 users if requested "summary of 3 users"
                limit = 10
                if "3" in prompt: limit = 3
                elif "5" in prompt: limit = 5
                
                users_to_show = context["users"][:limit]
                for user in users_to_show:
                    risk_band = "LOW"
                    if user['risk_score'] >= 85: risk_band = "CRITICAL"
                    elif user['risk_score'] >= 60: risk_band = "HIGH"
                    elif user['risk_score'] >= 30: risk_band = "MEDIUM"
                    
                    response_text += f"- **{user['name']}** (ID: {user['id']}): Risk Score **{user['risk_score']}** ({risk_band}). Activity: {user['last_login_device']}\n"
                
                response_text += "\nThese users show various behavioral anomalies ranging from device mismatches to unusual transaction volumes."
            else:
                response_text += "I've processed your query, but no user context was available to summarize."
        else:
            response_text += f"I've processed your query about the alerts: '{prompt}'.\n\n"
            
            if context and "risk_score" in context:
                response_text += f"> Context Loaded: Subject risk score is **{context['risk_score']}**.\n\n"
                
            response_text += "Based on correlation with our Isolation Forest baseline, this is highly indicative of an **insider threat** scenario, potentially credential harvesting or bulk exfiltration. I recommend placing an immediate temporary lock on the account while performing a human review."
    
    words = response_text.split(" ")
    
    # Send start event
    yield f"data: {json.dumps({'type': 'message_start'})}\n\n"
    
    # Simulate Server-Sent Events (SSE) stream typing delay
    for word in words:
        await asyncio.sleep(0.005) # Faster typing simulation
        chunk = {
            "type": "content_block_delta",
            "delta": {"type": "text_delta", "text": word + " "}
        }
        yield f"data: {json.dumps(chunk)}\n\n"
        
    # Send stop event
    yield f"data: {json.dumps({'type': 'message_stop'})}\n\n"

async def call_anthropic_stream(messages, context):
    from models.mock_data import MOCK_USERS, MOCK_ALERTS, MOCK_TRANSACTIONS

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    
    # Inject live data for context
    live_context = {
        "users": list(MOCK_USERS.values())[:10], # Top 10 for token efficiency
        "recent_alerts": MOCK_ALERTS[:10],
        "example_transactions": {k: v[:5] for k, v in list(MOCK_TRANSACTIONS.items())[:5]}
    }
    
    # Ensure messages alternate correctly and start with 'user'
    valid_messages = []
    for m in messages:
        if not valid_messages and m['role'] != 'user':
            continue
        if valid_messages and valid_messages[-1]['role'] == m['role']:
            valid_messages[-1]['content'] += "\n\n" + m['content']
        else:
            valid_messages.append(m)

    if not api_key:
        async for chunk in simulate_claude_response(valid_messages, live_context):
            yield chunk
        return
        
    system_prompt = f"""
You are SENTINEL, an AI-powered fraud detection assistant for a banking system.
You have real-time access to user profiles, transactions, risk scores, alerts, and audit logs.

════════════════════════════════════════
ROLE & BEHAVIOUR
════════════════════════════════════════
- You are a professional fraud analyst assistant, not a general chatbot.
- You only answer questions related to users, transactions, fraud alerts, risk scores, and system data.
- If asked something unrelated to banking/fraud, politely redirect.
- Always be concise, data-driven, and precise. Never guess — use only the data provided.

════════════════════════════════════════
RISK SCORE BANDS
════════════════════════════════════════
85–100 → CRITICAL  → Instant account freeze + all notifications fired
60–84  → HIGH      → Flagged for investigation
30–59  → MEDIUM    → Added to watchlist + extra monitoring
0–29   → LOW       → Normal behaviour, no action needed

════════════════════════════════════════
WHAT YOU CAN DO
════════════════════════════════════════
1. USER LOOKUP: Show full profile, transactions, and risk explanation.
2. TRANSACTION ANALYSIS: Highlight suspicious patterns (off-hours, geo-jumps).
3. COMPARISON: Compare users side-by-side using actual data points.
4. ALERT SUMMARY: Filter and count alerts by severity.
5. EXCEL EXPORT: Prefix response with EXPORT_EXCEL: followed by JSON data.
6. RISK EXPLANATION (SHAP-style): Break down score contributions (+pts).

════════════════════════════════════════
RESPONSE FORMAT RULES
════════════════════════════════════════
- Use **bold** for names and scores.
- Use tables for multiple records.
- Always mention the risk band (CRITICAL / HIGH / etc.)
- Keep answers under 200 words.
- For Excel exports, always prefix with EXPORT_EXCEL:

════════════════════════════════════════
LIVE SYSTEM DATA
════════════════════════════════════════
{json.dumps(live_context, indent=2)}
"""
    
    if context:
        system_prompt += f"\n\nADDITIONAL USER CONTEXT:\n{json.dumps(context, indent=2)}"
        
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
        "messages": valid_messages,
        "stream": True
    }
    
    print(f"DEBUG: Anthropic Request Payload: {json.dumps(payload)[:500]}...") # Log first 500 chars
    
    async with httpx.AsyncClient() as client:
        try:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    error_msg = await response.aread()
                    error_json = {}
                    try:
                        error_json = json.loads(error_msg.decode())
                    except:
                        pass
                    
                    print(f"Anthropic API Error {response.status_code}: {error_msg.decode()}")
                    
                    # Fallback to demo mode if credits are low or key is invalid
                    if "credit balance" in str(error_json).lower() or "api_key_invalid" in str(error_json).lower():
                        print("Fallback: Switching to Demo Mode due to API issues.")
                        async for chunk in simulate_claude_response(valid_messages, live_context):
                            yield chunk
                        return

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
