#!/usr/bin/env python3
"""
Client Panel Flow Test - Following the exact test flow from review request
"""

import requests
import json
import sys

# Configuration
BASE_URL = "https://affiliboost-2.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test credentials
CLIENT_EMAIL = "cliente@example.com"
CLIENT_PASSWORD = "Client123!"

class ClientPanelFlowTester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        print(f"[{level}] {message}")
        
    def make_request(self, method: str, endpoint: str, data: dict = None, 
                    headers: dict = None, use_auth: bool = True) -> requests.Response:
        """Make HTTP request with proper headers"""
        url = f"{API_BASE}{endpoint}"
        
        # Default headers
        req_headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Add auth header if token available and requested
        if use_auth and self.access_token:
            req_headers["Authorization"] = f"Bearer {self.access_token}"
            
        # Merge with provided headers
        if headers:
            req_headers.update(headers)
            
        self.log(f"Making {method} request to {url}")
        if data:
            self.log(f"Request data: {json.dumps(data, indent=2)}")
            
        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data if data else None,
                headers=req_headers,
                timeout=30
            )
            
            self.log(f"Response status: {response.status_code}")
            
            # Try to parse JSON response
            try:
                response_data = response.json()
                self.log(f"Response data: {json.dumps(response_data, indent=2)}")
            except:
                self.log(f"Response text: {response.text}")
                
            return response
            
        except requests.exceptions.RequestException as e:
            self.log(f"Request failed: {str(e)}", "ERROR")
            raise

    def test_flow(self):
        """Execute the complete test flow as specified in review request"""
        
        self.log("🚀 Starting Client Panel Flow Test")
        self.log("=" * 60)
        
        # 1. Login as client
        self.log("\n1️⃣ Login as client")
        login_data = {
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        }
        
        response = self.make_request("POST", "/auth/login", login_data, use_auth=False)
        if response.status_code != 200:
            self.log("❌ Login failed", "ERROR")
            return False
            
        response_data = response.json()
        self.access_token = response_data.get("access_token")
        if not self.access_token:
            self.log("❌ No access token received", "ERROR")
            return False
            
        self.log("✅ Login successful")
        
        # 2. Get client profile - verify structure
        self.log("\n2️⃣ Get client profile - verify structure")
        response = self.make_request("GET", "/client/profile")
        if response.status_code != 200:
            self.log("❌ Get profile failed", "ERROR")
            return False
            
        profile_data = response.json()
        if "profile" not in profile_data or "user" not in profile_data:
            self.log("❌ Profile structure invalid", "ERROR")
            return False
            
        self.log("✅ Profile structure verified")
        
        # 3. Update profile with new countryIso
        self.log("\n3️⃣ Update profile with new countryIso")
        update_data = {
            "countryIso": "FR",
            "telegramUserId": "987654321",
            "locale": "fr-FR"
        }
        
        response = self.make_request("PUT", "/client/profile", update_data)
        if response.status_code != 200:
            self.log("❌ Update profile failed", "ERROR")
            return False
            
        self.log("✅ Profile update completed")
        
        # 4. Get purchases list
        self.log("\n4️⃣ Get purchases list")
        response = self.make_request("GET", "/client/purchases")
        if response.status_code != 200:
            self.log("❌ Get purchases failed", "ERROR")
            return False
            
        purchases = response.json()
        self.log(f"✅ Retrieved {len(purchases)} purchases")
        
        # 5. Get payment history
        self.log("\n5️⃣ Get payment history")
        response = self.make_request("GET", "/client/payments")
        if response.status_code != 200:
            self.log("❌ Get payments failed", "ERROR")
            return False
            
        payments = response.json()
        self.log(f"✅ Retrieved {len(payments)} payment records")
        
        # 6. Create a support ticket
        self.log("\n6️⃣ Create a support ticket with category 'access', subject 'Test ticket', description 'Testing'")
        ticket_data = {
            "category": "access",
            "subject": "Test ticket",
            "description": "Testing"
        }
        
        response = self.make_request("POST", "/support/tickets", ticket_data)
        if response.status_code not in [200, 201]:
            self.log("❌ Create ticket failed", "ERROR")
            return False
            
        ticket_response = response.json()
        if not ticket_response.get("success"):
            self.log("❌ Ticket creation not successful", "ERROR")
            return False
            
        ticket_id = ticket_response.get("ticketId")
        if not ticket_id:
            self.log("❌ No ticket ID received", "ERROR")
            return False
            
        self.log(f"✅ Support ticket created with ID: {ticket_id}")
        
        # 7. Get my tickets and verify the new ticket appears
        self.log("\n7️⃣ Get my tickets and verify the new ticket appears")
        response = self.make_request("GET", "/support/tickets/my")
        if response.status_code != 200:
            self.log("❌ Get my tickets failed", "ERROR")
            return False
            
        tickets = response.json()
        ticket_found = any(ticket.get("id") == ticket_id for ticket in tickets)
        if not ticket_found:
            self.log("❌ New ticket not found in tickets list", "ERROR")
            return False
            
        self.log(f"✅ New ticket found in list of {len(tickets)} tickets")
        
        # 8. Get ticket details
        self.log("\n8️⃣ Get ticket details")
        response = self.make_request("GET", f"/support/tickets/my/{ticket_id}")
        if response.status_code != 200:
            self.log("❌ Get ticket details failed", "ERROR")
            return False
            
        ticket_details = response.json()
        if "error" in ticket_details:
            self.log(f"❌ Ticket details error: {ticket_details['error']}", "ERROR")
            return False
            
        # Verify ticket details match what we created
        if (ticket_details.get("category") == ticket_data["category"] and
            ticket_details.get("subject") == ticket_data["subject"] and
            ticket_details.get("description") == ticket_data["description"]):
            self.log("✅ Ticket details verified successfully")
        else:
            self.log("❌ Ticket details don't match", "ERROR")
            return False
        
        self.log("\n🎉 ALL FLOW TESTS PASSED!")
        self.log("=" * 60)
        return True

def main():
    """Main test execution"""
    tester = ClientPanelFlowTester()
    
    try:
        success = tester.test_flow()
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n❌ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()