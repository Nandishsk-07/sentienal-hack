from fastapi import APIRouter
from .blockchain import blockchain_ledger

router = APIRouter()

@router.get("/log")
def get_blockchain_log():
    """
    Returns the entirety of the immutable blockchain ledger containing all hashed alerts.
    """
    return {
        "chain": blockchain_ledger.chain,
        "total_blocks": len(blockchain_ledger.chain)
    }

@router.get("/verify")
def verify_blockchain():
    """
    Iterates through the entire ledger computing SHA-256 hashes against prev_hash pointers
    to verify absolute cryptographic integrity of the audit log.
    """
    is_valid = blockchain_ledger.verify_chain()
    return {
        "valid": is_valid,
        "total_blocks": len(blockchain_ledger.chain)
    }
