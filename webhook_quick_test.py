#!/usr/bin/env python3
"""
Quick webhook test to verify endpoint responds
"""

import requests
import json
import time

BASE_URL = "https://apifix-2.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def test_webhook_quick():
    """Test webhook with very short timeout"""
    print("Testing webhook endpoint with 2 second timeout...")
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{API_BASE}/telegram/webhook",
            json={},
            headers={"Content-Type": "application/json"},
            timeout=2
        )
        end_time = time.time()
        
        print(f"Response received in {end_time - start_time:.2f} seconds")
        print(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"Response data: {json.dumps(data, indent=2)}")
                if 'ok' in data:
                    print("✅ Webhook endpoint working - returns 'ok' field")
                    return True
                else:
                    print("⚠️ Webhook endpoint working but missing 'ok' field")
                    return True
            except:
                print(f"Response text: {response.text}")
                return True
        else:
            print(f"❌ Webhook failed with status {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Webhook timed out after 2 seconds")
        return False
    except Exception as e:
        print(f"❌ Webhook test failed: {str(e)}")
        return False

if __name__ == "__main__":
    test_webhook_quick()