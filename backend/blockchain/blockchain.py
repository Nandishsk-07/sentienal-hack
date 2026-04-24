import hashlib
import time
import random

class SentinelBlockchain:
    def __init__(self):
        self.chain = []
        self.create_genesis_block()
        
    def create_genesis_block(self):
        genesis_block = {
            "block_index": 0,
            "timestamp": time.time(),
            "alert_hash": "000000000000000000000GENESISBLOCK00000000000000000000000000000",
            "prev_hash": "0",
            "data": "System Initialization Ledger Start",
            "metadata": None
        }
        self.chain.append(genesis_block)
        
    def calculate_hash(self, alert_id, user_id, timestamp, risk_score, investigator_id, prev_hash):
        # Concatenate values to form the cryptographic payload
        payload = f"{alert_id}|{user_id}|{timestamp}|{risk_score}|{investigator_id}|{prev_hash}"
        return hashlib.sha256(payload.encode('utf-8')).hexdigest()
        
    def add_block(self, alert_id, user_id, risk_score, investigator_id, data_payload):
        prev_block = self.chain[-1]
        prev_hash = prev_block["alert_hash"]
        
        # Use precise timestamp for hash
        timestamp = time.time()
        
        # Calculate the cryptographic hash including previous hash to chain them
        new_hash = self.calculate_hash(alert_id, user_id, timestamp, risk_score, investigator_id, prev_hash)
        
        new_block = {
            "block_index": len(self.chain),
            "timestamp": timestamp,
            "alert_hash": new_hash,
            "prev_hash": prev_hash,
            "data": data_payload,
            "metadata": {
                "alert_id": alert_id,
                "user_id": user_id,
                "risk_score": risk_score,
                "investigator_id": investigator_id
            }
        }
        self.chain.append(new_block)
        return new_block
        
    def verify_chain(self):
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            prev = self.chain[i-1]
            
            # 1. Verify link points correctly
            if current["prev_hash"] != prev["alert_hash"]:
                return False
                
            # 2. Verify immutability of payload
            m = current["metadata"]
            if not m: 
                continue
                
            recalculated = self.calculate_hash(
                m["alert_id"], 
                m["user_id"], 
                current["timestamp"], 
                m["risk_score"], 
                m["investigator_id"], 
                current["prev_hash"]
            )
            
            if current["alert_hash"] != recalculated:
                return False
                
        return True

# Initialize a global ledger instance in memory
blockchain_ledger = SentinelBlockchain()

# Seed the chain with some mock alerts so it isn't empty on boot
def _seed_initial_data():
    sample_users = ["User_0042", "User_0112", "User_0210", "User_0441", "User_0305"]
    
    # Wait tiny amounts to ensure distinct timestamps
    for i in range(6):
        blockchain_ledger.add_block(
            alert_id=f"ALT-{random.randint(10000, 99999)}",
            user_id=random.choice(sample_users),
            risk_score=random.randint(40, 99),
            investigator_id="SYS_AUTO",
            data_payload="Behavioral anomaly signature flagged by IsolationForest ML model."
        )

# Seed it once on import
_seed_initial_data()
