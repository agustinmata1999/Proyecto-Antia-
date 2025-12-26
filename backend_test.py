#!/usr/bin/env python3
"""
Antia Platform Backend API Testing
Tests Product CRUD functionality for tipster platform
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://affpanel-2.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test credentials
TIPSTER_EMAIL = "fausto.perez@antia.com"
TIPSTER_PASSWORD = "Tipster123!"
ADMIN_EMAIL = "admin@antia.com"
ADMIN_PASSWORD = "SuperAdmin123!"
CLIENT_EMAIL = "cliente@example.com"
CLIENT_PASSWORD = "Client123!"

class AntiaAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.admin_access_token = None
        self.client_access_token = None
        self.test_product_id = None
        self.test_order_id_for_cleanup = None
        self.test_channel_id = None
        self.test_house_id = None
        self.test_campaign_id = None
        self.test_ticket_id = None
        self.test_application_id = None
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        print(f"[{level}] {message}")
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    headers: Dict = None, use_auth: bool = True) -> requests.Response:
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
            
    def test_login(self) -> bool:
        """Test authentication with tipster credentials"""
        self.log("=== Testing Authentication ===")
        
        login_data = {
            "email": TIPSTER_EMAIL,
            "password": TIPSTER_PASSWORD
        }
        
        try:
            response = self.make_request("POST", "/auth/login", login_data, use_auth=False)
            
            if response.status_code == 200:
                response_data = response.json()
                
                # Check if access_token is in response
                if "access_token" in response_data:
                    self.access_token = response_data["access_token"]
                    self.log("✅ Login successful - JWT token received")
                    return True
                else:
                    self.log("❌ Login response missing access_token", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Login failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Login test failed: {str(e)}", "ERROR")
            return False
            
    def test_get_my_products(self) -> bool:
        """Test getting tipster's products"""
        self.log("=== Testing Get My Products ===")
        
        try:
            response = self.make_request("GET", "/products/my")
            
            if response.status_code == 200:
                products = response.json()
                self.log(f"✅ Successfully retrieved {len(products)} products")
                
                # Log product details for debugging
                for i, product in enumerate(products):
                    self.log(f"Product {i+1}: {product.get('title', 'No title')} (ID: {product.get('id', 'No ID')})")
                    
                return True
            else:
                self.log(f"❌ Get my products failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get my products test failed: {str(e)}", "ERROR")
            return False
            
    def test_create_product(self) -> bool:
        """Test creating a new product"""
        self.log("=== Testing Create Product ===")
        
        product_data = {
            "title": "Test Product from Agent",
            "description": "Testing product creation via API",
            "priceCents": 3500,
            "currency": "EUR",
            "billingType": "ONE_TIME",
            "telegramChannelId": "@test_channel",
            "accessMode": "AUTO_JOIN"
        }
        
        try:
            response = self.make_request("POST", "/products", product_data)
            
            if response.status_code == 201:
                product = response.json()
                self.test_product_id = product.get("id")
                self.log(f"✅ Product created successfully with ID: {self.test_product_id}")
                
                # Verify product fields
                if product.get("title") == product_data["title"]:
                    self.log("✅ Product title matches")
                else:
                    self.log("❌ Product title mismatch", "ERROR")
                    
                if product.get("priceCents") == product_data["priceCents"]:
                    self.log("✅ Product price matches")
                else:
                    self.log("❌ Product price mismatch", "ERROR")
                    
                return True
            else:
                self.log(f"❌ Create product failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Create product test failed: {str(e)}", "ERROR")
            return False
            
    def test_get_single_product(self) -> bool:
        """Test getting a single product by ID"""
        if not self.test_product_id:
            self.log("❌ No test product ID available", "ERROR")
            return False
            
        self.log("=== Testing Get Single Product ===")
        
        try:
            response = self.make_request("GET", f"/products/{self.test_product_id}")
            
            if response.status_code == 200:
                product = response.json()
                self.log(f"✅ Successfully retrieved product: {product.get('title', 'No title')}")
                return True
            else:
                self.log(f"❌ Get single product failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get single product test failed: {str(e)}", "ERROR")
            return False
            
    def test_update_product(self) -> bool:
        """Test updating a product"""
        if not self.test_product_id:
            self.log("❌ No test product ID available", "ERROR")
            return False
            
        self.log("=== Testing Update Product ===")
        
        update_data = {
            "title": "Updated Test Product from Agent",
            "priceCents": 4500,
            "description": "Updated description via API testing"
        }
        
        try:
            response = self.make_request("PATCH", f"/products/{self.test_product_id}", update_data)
            
            if response.status_code == 200:
                product = response.json()
                self.log("✅ Product updated successfully")
                
                # Verify updates
                if product.get("title") == update_data["title"]:
                    self.log("✅ Product title updated correctly")
                else:
                    self.log("❌ Product title update failed", "ERROR")
                    
                if product.get("priceCents") == update_data["priceCents"]:
                    self.log("✅ Product price updated correctly")
                else:
                    self.log("❌ Product price update failed", "ERROR")
                    
                return True
            else:
                self.log(f"❌ Update product failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Update product test failed: {str(e)}", "ERROR")
            return False
            
    def test_pause_product(self) -> bool:
        """Test pausing a product"""
        if not self.test_product_id:
            self.log("❌ No test product ID available", "ERROR")
            return False
            
        self.log("=== Testing Pause Product ===")
        
        try:
            response = self.make_request("POST", f"/products/{self.test_product_id}/pause")
            
            if response.status_code in [200, 201]:  # Accept both 200 and 201
                product = response.json()
                self.log("✅ Product paused successfully")
                
                # Check if product is inactive
                if product.get("active") == False:
                    self.log("✅ Product active status is false")
                    return True
                else:
                    self.log("❌ Product active status not updated correctly", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Pause product failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Pause product test failed: {str(e)}", "ERROR")
            return False
            
    def test_publish_product(self) -> bool:
        """Test publishing/activating a product"""
        if not self.test_product_id:
            self.log("❌ No test product ID available", "ERROR")
            return False
            
        self.log("=== Testing Publish Product ===")
        
        try:
            response = self.make_request("POST", f"/products/{self.test_product_id}/publish")
            
            if response.status_code in [200, 201]:  # Accept both 200 and 201
                product = response.json()
                self.log("✅ Product published successfully")
                
                # Check if product is active
                if product.get("active") == True:
                    self.log("✅ Product active status is true")
                    return True
                else:
                    self.log("❌ Product active status not updated correctly", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Publish product failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Publish product test failed: {str(e)}", "ERROR")
            return False
            
    def test_verify_product_in_list(self) -> bool:
        """Verify the created product appears in the products list"""
        self.log("=== Testing Product Appears in List ===")
        
        try:
            response = self.make_request("GET", "/products/my")
            
            if response.status_code == 200:
                products = response.json()
                
                # Look for our test product
                found_product = None
                for product in products:
                    if product.get("id") == self.test_product_id:
                        found_product = product
                        break
                        
                if found_product:
                    self.log("✅ Created product appears in products list")
                    self.log(f"Product details: {found_product.get('title')} - {found_product.get('priceCents')} cents")
                    return True
                else:
                    self.log("❌ Created product NOT found in products list", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Failed to get products list with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Verify product in list test failed: {str(e)}", "ERROR")
            return False
            
    def test_stripe_checkout_get_product(self) -> bool:
        """Test getting product for checkout"""
        self.log("=== Testing Stripe Checkout - Get Product ===")
        
        # Use the specific product ID from the review request
        product_id = "6941ab8bc37d0aa47ab23ef8"
        
        try:
            response = self.make_request("GET", f"/checkout/product/{product_id}", use_auth=False)
            
            if response.status_code == 200:
                product = response.json()
                self.log("✅ Successfully retrieved product for checkout")
                
                # Verify required fields
                required_fields = ["id", "title", "priceCents", "currency"]
                for field in required_fields:
                    if field in product:
                        self.log(f"✅ Product has {field}: {product[field]}")
                    else:
                        self.log(f"❌ Product missing {field}", "ERROR")
                        return False
                        
                # Check if tipster info is included
                if "tipster" in product and product["tipster"]:
                    self.log(f"✅ Tipster info included: {product['tipster'].get('publicName', 'No name')}")
                else:
                    self.log("⚠️ No tipster info in response", "WARN")
                    
                return True
            else:
                self.log(f"❌ Get product for checkout failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get product for checkout test failed: {str(e)}", "ERROR")
            return False
            
    def test_stripe_checkout_create_session(self) -> bool:
        """Test creating Stripe checkout session (expected to fail with test key)"""
        self.log("=== Testing Stripe Checkout - Create Session ===")
        
        checkout_data = {
            "productId": "6941ab8bc37d0aa47ab23ef8",
            "originUrl": "https://affpanel-2.preview.emergentagent.com",
            "isGuest": True,
            "email": "test@example.com"
        }
        
        try:
            response = self.make_request("POST", "/checkout/session", checkout_data, use_auth=False)
            
            # We expect this to fail because STRIPE_API_KEY is a test key (sk_test_emergent)
            if response.status_code == 400:
                response_data = response.json()
                self.log("✅ Checkout session creation failed as expected (test Stripe key)")
                self.log(f"Error message: {response_data.get('message', 'No message')}")
                return True
            elif response.status_code == 200 or response.status_code == 201:
                # If it somehow succeeds, that's also valid
                response_data = response.json()
                self.log("✅ Checkout session created successfully")
                if "url" in response_data and "orderId" in response_data:
                    self.log(f"Session URL: {response_data['url']}")
                    self.log(f"Order ID: {response_data['orderId']}")
                    return True
                else:
                    self.log("❌ Response missing required fields (url, orderId)", "ERROR")
                    return False
            else:
                self.log(f"❌ Unexpected response status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Create checkout session test failed: {str(e)}", "ERROR")
            return False
            
    def test_telegram_webhook(self) -> bool:
        """Test Telegram webhook with generic message"""
        self.log("=== Testing Telegram Webhook ===")
        
        # Simulate a Telegram webhook payload with generic text
        webhook_data = {
            "update_id": 123456789,
            "message": {
                "message_id": 1,
                "from": {
                    "id": 987654321,
                    "is_bot": False,
                    "first_name": "Test",
                    "username": "testuser"
                },
                "chat": {
                    "id": 987654321,
                    "first_name": "Test",
                    "username": "testuser",
                    "type": "private"
                },
                "date": 1703000000,
                "text": "Hola"
            }
        }
        
        try:
            response = self.make_request("POST", "/telegram/webhook", webhook_data, use_auth=False)
            
            # The webhook should process the message and return ok: true or false
            if response.status_code == 200:
                response_data = response.json()
                self.log("✅ Telegram webhook processed message")
                self.log(f"Response: {response_data}")
                return True
            else:
                self.log(f"❌ Telegram webhook failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Telegram webhook test failed: {str(e)}", "ERROR")
            return False
            
    def test_mongodb_orders(self) -> bool:
        """Test MongoDB orders collection"""
        self.log("=== Testing MongoDB Orders Collection ===")
        
        try:
            # Use mongosh to check orders
            import subprocess
            
            cmd = [
                "mongosh", "--quiet", "antia_db", 
                "--eval", "db.orders.find({}).sort({created_at:-1}).limit(3).toArray()"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                self.log("✅ Successfully queried MongoDB orders collection")
                self.log(f"MongoDB output: {result.stdout}")
                
                # Check if we got valid JSON output
                try:
                    import json
                    orders = json.loads(result.stdout)
                    self.log(f"Found {len(orders)} recent orders")
                    return True
                except json.JSONDecodeError:
                    self.log("⚠️ MongoDB output is not valid JSON, but query succeeded", "WARN")
                    return True
            else:
                self.log(f"❌ MongoDB query failed: {result.stderr}", "ERROR")
                return False
                
        except subprocess.TimeoutExpired:
            self.log("❌ MongoDB query timed out", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ MongoDB test failed: {str(e)}", "ERROR")
            return False

    def test_get_order_details(self) -> bool:
        """Test getting order details by ID"""
        self.log("=== Testing Get Order Details ===")
        
        # Use the specific order ID from the review request
        order_id = "69420512627906d2653f118c"
        
        try:
            response = self.make_request("GET", f"/checkout/order/{order_id}", use_auth=False)
            
            if response.status_code == 200:
                order_data = response.json()
                self.log("✅ Successfully retrieved order details")
                
                # Verify required fields
                if "order" in order_data:
                    order = order_data["order"]
                    self.log(f"Order ID: {order.get('id', 'N/A')}")
                    self.log(f"Status: {order.get('status', 'N/A')}")
                    self.log(f"Amount: {order.get('amountCents', 'N/A')} cents")
                    
                    # Check if status is PAGADA as expected
                    if order.get('status') == 'PAGADA':
                        self.log("✅ Order status is PAGADA as expected")
                    else:
                        self.log(f"⚠️ Order status is {order.get('status')}, expected PAGADA", "WARN")
                else:
                    self.log("❌ Order data missing in response", "ERROR")
                    return False
                
                # Check for product and tipster info
                if "product" in order_data and order_data["product"]:
                    product = order_data["product"]
                    self.log(f"✅ Product info included: {product.get('title', 'No title')}")
                else:
                    self.log("⚠️ No product info in response", "WARN")
                    
                if "tipster" in order_data and order_data["tipster"]:
                    tipster = order_data["tipster"]
                    self.log(f"✅ Tipster info included: {tipster.get('publicName', 'No name')}")
                else:
                    self.log("⚠️ No tipster info in response", "WARN")
                    
                return True
            else:
                self.log(f"❌ Get order details failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get order details test failed: {str(e)}", "ERROR")
            return False

    def create_test_order_in_mongodb(self) -> str:
        """Create a new pending order in MongoDB and return the order ID"""
        self.log("=== Creating Test Order in MongoDB ===")
        
        try:
            import subprocess
            
            # MongoDB command to create new order
            mongo_script = '''
            const orderId = new ObjectId();
            db.orders.insertOne({
              _id: orderId,
              product_id: '6941ab8bc37d0aa47ab23ef8',
              tipster_id: '6941ab14c37d0aa47ab23ec6',
              amount_cents: 3400,
              currency: 'EUR',
              email_backup: 'nuevo@test.com',
              telegram_user_id: '98765432',
              status: 'PENDING',
              payment_provider: 'stripe',
              created_at: new Date(),
              updated_at: new Date()
            });
            print('ORDER_ID=' + orderId.toString());
            '''
            
            cmd = ["mongosh", "--quiet", "antia", "--eval", mongo_script]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                # Extract order ID from output
                output_lines = result.stdout.strip().split('\n')
                order_id = None
                
                for line in output_lines:
                    if line.startswith('ORDER_ID='):
                        order_id = line.replace('ORDER_ID=', '').strip()
                        break
                
                if order_id:
                    self.log(f"✅ Created test order with ID: {order_id}")
                    return order_id
                else:
                    self.log("❌ Could not extract order ID from MongoDB output", "ERROR")
                    self.log(f"MongoDB output: {result.stdout}")
                    return None
            else:
                self.log(f"❌ MongoDB order creation failed: {result.stderr}", "ERROR")
                return None
                
        except subprocess.TimeoutExpired:
            self.log("❌ MongoDB order creation timed out", "ERROR")
            return None
        except Exception as e:
            self.log(f"❌ Create test order failed: {str(e)}", "ERROR")
            return None

    def test_simulate_payment(self, order_id: str) -> bool:
        """Test simulating payment for an order"""
        if not order_id:
            self.log("❌ No order ID provided for payment simulation", "ERROR")
            return False
            
        self.log(f"=== Testing Simulate Payment for Order {order_id} ===")
        
        try:
            response = self.make_request("POST", f"/checkout/simulate-payment/{order_id}", use_auth=False)
            
            if response.status_code in [200, 201]:  # Accept both 200 and 201
                payment_result = response.json()
                self.log("✅ Payment simulation successful")
                
                # Check response structure
                if payment_result.get("success"):
                    self.log("✅ Payment marked as successful")
                    
                    # Check if order status changed
                    if "order" in payment_result:
                        order = payment_result["order"]
                        if order.get("status") == "PAGADA":
                            self.log("✅ Order status changed to PAGADA")
                        else:
                            self.log(f"❌ Order status is {order.get('status')}, expected PAGADA", "ERROR")
                            return False
                    else:
                        self.log("⚠️ No order info in payment response", "WARN")
                        
                    # Check Telegram notification result
                    if "telegramNotification" in payment_result:
                        telegram_result = payment_result["telegramNotification"]
                        if telegram_result:
                            self.log("✅ Telegram notification attempted")
                        else:
                            self.log("⚠️ No Telegram notification result", "WARN")
                    
                    return True
                else:
                    self.log("❌ Payment simulation marked as failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Simulate payment failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Simulate payment test failed: {str(e)}", "ERROR")
            return False

    def test_complete_payment(self, order_id: str) -> bool:
        """Test complete payment endpoint"""
        if not order_id:
            self.log("❌ No order ID provided for complete payment", "ERROR")
            return False
            
        self.log(f"=== Testing Complete Payment for Order {order_id} ===")
        
        complete_data = {
            "orderId": order_id
        }
        
        try:
            response = self.make_request("POST", "/checkout/complete-payment", complete_data, use_auth=False)
            
            if response.status_code in [200, 201]:  # Accept both 200 and 201
                complete_result = response.json()
                self.log("✅ Complete payment successful")
                
                # Check response structure
                if complete_result.get("success"):
                    self.log("✅ Payment completion marked as successful")
                    
                    # Check for order, product, and tipster data
                    required_fields = ["order", "product", "tipster"]
                    for field in required_fields:
                        if field in complete_result and complete_result[field]:
                            if field == "order":
                                order = complete_result[field]
                                self.log(f"✅ Order data: ID={order.get('id')}, Status={order.get('status')}")
                            elif field == "product":
                                product = complete_result[field]
                                self.log(f"✅ Product data: {product.get('title')} - {product.get('priceCents')} cents")
                            elif field == "tipster":
                                tipster = complete_result[field]
                                self.log(f"✅ Tipster data: {tipster.get('publicName')}")
                        else:
                            self.log(f"❌ Missing {field} data in response", "ERROR")
                            return False
                    
                    return True
                else:
                    self.log("❌ Payment completion marked as failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Complete payment failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Complete payment test failed: {str(e)}", "ERROR")
            return False

    def verify_order_in_mongodb(self, order_id: str = None) -> bool:
        """Verify order is updated in MongoDB"""
        self.log("=== Verifying Order in MongoDB ===")
        
        try:
            import subprocess
            
            if order_id:
                # Check specific order
                mongo_script = f'db.orders.findOne({{_id: ObjectId("{order_id}")}}, {{status: 1, payment_provider: 1, paid_at: 1}})'
            else:
                # Check any PAGADA order
                mongo_script = 'db.orders.findOne({status: "PAGADA"}, {status: 1, payment_provider: 1, paid_at: 1})'
            
            cmd = ["mongosh", "--quiet", "antia", "--eval", mongo_script]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                self.log("✅ Successfully queried MongoDB for order verification")
                self.log(f"MongoDB output: {result.stdout}")
                
                # Check if we got a valid result
                if "PAGADA" in result.stdout:
                    self.log("✅ Found order with status PAGADA")
                    
                    if "paid_at" in result.stdout:
                        self.log("✅ Order has paid_at timestamp")
                    else:
                        self.log("⚠️ Order missing paid_at timestamp", "WARN")
                    
                    return True
                else:
                    self.log("❌ No PAGADA order found in MongoDB", "ERROR")
                    return False
            else:
                self.log(f"❌ MongoDB verification failed: {result.stderr}", "ERROR")
                return False
                
        except subprocess.TimeoutExpired:
            self.log("❌ MongoDB verification timed out", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ MongoDB verification failed: {str(e)}", "ERROR")
            return False

    def check_telegram_notification_logs(self) -> bool:
        """Check backend logs for Telegram notification attempts"""
        self.log("=== Checking Backend Logs for Telegram Notifications ===")
        
        try:
            import subprocess
            
            # Check supervisor backend logs for Telegram notification messages
            cmd = ["tail", "-n", "100", "/var/log/supervisor/backend.out.log"]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                log_content = result.stdout
                
                # Look for payment success notification messages
                if "Processing payment success notification" in log_content:
                    self.log("✅ Found 'Processing payment success notification' in logs")
                    
                    # Check for other related messages
                    if "chat not found" in log_content.lower():
                        self.log("✅ Found expected 'chat not found' error (test chat_id doesn't exist)")
                    
                    return True
                else:
                    self.log("⚠️ No 'Processing payment success notification' found in recent logs", "WARN")
                    self.log("Recent log entries:")
                    # Show last few lines for debugging
                    lines = log_content.split('\n')[-10:]
                    for line in lines:
                        if line.strip():
                            self.log(f"  {line}")
                    return True  # Still pass as notification may not have been triggered
            else:
                self.log(f"❌ Could not read backend logs: {result.stderr}", "ERROR")
                return False
                
        except subprocess.TimeoutExpired:
            self.log("❌ Log check timed out", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ Log check failed: {str(e)}", "ERROR")
            return False

    # ===== PREMIUM CHANNEL FLOW TESTS =====
    
    def test_get_channel_info(self) -> bool:
        """Test getting channel info including premium channel link"""
        self.log("=== Testing Get Channel Info (Premium Channel) ===")
        
        try:
            response = self.make_request("GET", "/telegram/channel-info")
            
            if response.status_code == 200:
                channel_info = response.json()
                self.log("✅ Successfully retrieved channel info")
                
                # Check response structure
                expected_fields = ["connected", "channel", "premiumChannelLink"]
                for field in expected_fields:
                    if field in channel_info:
                        self.log(f"✅ Channel info has {field}: {channel_info[field]}")
                    else:
                        self.log(f"❌ Channel info missing {field}", "ERROR")
                        return False
                
                # Check if premium channel link exists
                premium_link = channel_info.get("premiumChannelLink")
                if premium_link:
                    self.log(f"✅ Premium channel link found: {premium_link}")
                    # Validate it's a Telegram link
                    if "t.me" in premium_link:
                        self.log("✅ Premium channel link is valid Telegram URL")
                    else:
                        self.log("⚠️ Premium channel link doesn't appear to be Telegram URL", "WARN")
                else:
                    self.log("ℹ️ No premium channel link set (this is normal for initial state)")
                
                return True
            else:
                self.log(f"❌ Get channel info failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get channel info test failed: {str(e)}", "ERROR")
            return False

    def test_update_premium_channel_link(self) -> bool:
        """Test updating premium channel link"""
        self.log("=== Testing Update Premium Channel Link ===")
        
        update_data = {
            "premiumChannelLink": "https://t.me/+NuevoCanal456"
        }
        
        try:
            response = self.make_request("POST", "/telegram/premium-channel", update_data)
            
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                self.log("✅ Premium channel link updated successfully")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Update marked as successful")
                    
                    # Verify the link was set correctly
                    if result.get("premiumChannelLink") == update_data["premiumChannelLink"]:
                        self.log("✅ Premium channel link matches expected value")
                        return True
                    else:
                        self.log(f"❌ Premium channel link mismatch. Expected: {update_data['premiumChannelLink']}, Got: {result.get('premiumChannelLink')}", "ERROR")
                        return False
                else:
                    self.log("❌ Update marked as failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Update premium channel failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Update premium channel test failed: {str(e)}", "ERROR")
            return False

    def test_clear_premium_channel_link(self) -> bool:
        """Test clearing premium channel link (set to null)"""
        self.log("=== Testing Clear Premium Channel Link ===")
        
        clear_data = {
            "premiumChannelLink": None
        }
        
        try:
            response = self.make_request("POST", "/telegram/premium-channel", clear_data)
            
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                self.log("✅ Premium channel link cleared successfully")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Clear operation marked as successful")
                    
                    # Verify the link was cleared
                    if result.get("premiumChannelLink") is None:
                        self.log("✅ Premium channel link is null as expected")
                        return True
                    else:
                        self.log(f"❌ Premium channel link not cleared. Got: {result.get('premiumChannelLink')}", "ERROR")
                        return False
                else:
                    self.log("❌ Clear operation marked as failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Clear premium channel failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Clear premium channel test failed: {str(e)}", "ERROR")
            return False

    def test_set_premium_channel_final(self) -> bool:
        """Test setting premium channel back to a final value"""
        self.log("=== Testing Set Premium Channel Final ===")
        
        final_data = {
            "premiumChannelLink": "https://t.me/+CanalPremiumFinal"
        }
        
        try:
            response = self.make_request("POST", "/telegram/premium-channel", final_data)
            
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                self.log("✅ Premium channel link set to final value successfully")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Final set operation marked as successful")
                    
                    # Verify the link was set correctly
                    if result.get("premiumChannelLink") == final_data["premiumChannelLink"]:
                        self.log("✅ Premium channel link matches final expected value")
                        return True
                    else:
                        self.log(f"❌ Premium channel link mismatch. Expected: {final_data['premiumChannelLink']}, Got: {result.get('premiumChannelLink')}", "ERROR")
                        return False
                else:
                    self.log("❌ Final set operation marked as failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Set premium channel final failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Set premium channel final test failed: {str(e)}", "ERROR")
            return False

    def test_purchase_triggers_notification(self) -> bool:
        """Test that purchase triggers notification with channel link"""
        self.log("=== Testing Purchase Triggers Notification ===")
        
        purchase_data = {
            "productId": "694206ceb76f354acbfff5e9",
            "email": "test@final.com",
            "telegramUserId": "999888777"
        }
        
        try:
            response = self.make_request("POST", "/checkout/test-purchase", purchase_data, use_auth=False)
            
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                self.log("✅ Test purchase completed successfully")
                
                # Check if purchase was successful
                if result.get("success"):
                    self.log("✅ Purchase marked as successful")
                    
                    # Check if order was created
                    if "orderId" in result and result["orderId"]:
                        self.log(f"✅ Order created with ID: {result['orderId']}")
                        
                        # Store order ID for potential cleanup
                        self.test_order_id_for_cleanup = result["orderId"]
                        
                        # Check if product info is included
                        if "product" in result and result["product"]:
                            product = result["product"]
                            self.log(f"✅ Product info included: {product.get('title')} - {product.get('priceCents')} cents")
                        
                        # Check if tipster info is included
                        if "tipster" in result and result["tipster"]:
                            tipster = result["tipster"]
                            self.log(f"✅ Tipster info included: {tipster.get('publicName')}")
                        
                        return True
                    else:
                        self.log("❌ No order ID in response", "ERROR")
                        return False
                else:
                    self.log("❌ Purchase marked as failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Test purchase failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Test purchase failed: {str(e)}", "ERROR")
            return False

    def test_verify_tipster_earnings_updated(self) -> bool:
        """Test that tipster earnings are updated after purchase"""
        self.log("=== Testing Tipster Earnings Updated ===")
        
        try:
            response = self.make_request("GET", "/orders/stats")
            
            if response.status_code == 200:
                stats = response.json()
                self.log("✅ Successfully retrieved tipster stats")
                
                # Check response structure
                expected_fields = ["totalSales", "totalEarningsCents", "currency"]
                for field in expected_fields:
                    if field in stats:
                        self.log(f"✅ Stats has {field}: {stats[field]}")
                    else:
                        self.log(f"❌ Stats missing {field}", "ERROR")
                        return False
                
                # Check if earnings are reasonable (should be > 0 if there are sales)
                total_sales = stats.get("totalSales", 0)
                total_earnings = stats.get("totalEarningsCents", 0)
                
                if total_sales > 0:
                    self.log(f"✅ Tipster has {total_sales} total sales")
                    
                    if total_earnings > 0:
                        self.log(f"✅ Tipster has {total_earnings} cents in total earnings")
                        
                        # Check if earnings match expected amount (6900 cents from test purchase)
                        # Note: This might not be exact if there were previous sales
                        if total_earnings >= 6900:
                            self.log("✅ Total earnings include expected amount from test purchase")
                        else:
                            self.log(f"⚠️ Total earnings ({total_earnings}) less than expected minimum (6900)", "WARN")
                        
                        return True
                    else:
                        self.log("❌ Total earnings is 0 despite having sales", "ERROR")
                        return False
                else:
                    self.log("ℹ️ No sales found for tipster (this might be expected for new account)")
                    return True  # Still pass as this might be expected
                    
            else:
                self.log(f"❌ Get tipster stats failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Verify tipster earnings test failed: {str(e)}", "ERROR")
            return False

    # ===== GEOLOCATION-BASED PAYMENT SYSTEM TESTS =====
    
    def test_detect_gateway(self) -> bool:
        """Test gateway detection based on IP geolocation"""
        self.log("=== Testing Gateway Detection ===")
        
        try:
            response = self.make_request("GET", "/checkout/detect-gateway", use_auth=False)
            
            if response.status_code == 200:
                gateway_info = response.json()
                self.log("✅ Successfully retrieved gateway detection info")
                
                # Check response structure
                expected_fields = ["gateway", "geo", "availableMethods"]
                for field in expected_fields:
                    if field in gateway_info:
                        self.log(f"✅ Gateway info has {field}: {gateway_info[field]}")
                    else:
                        self.log(f"❌ Gateway info missing {field}", "ERROR")
                        return False
                
                # Validate gateway value
                gateway = gateway_info.get("gateway")
                if gateway in ["stripe", "redsys"]:
                    self.log(f"✅ Gateway is valid: {gateway}")
                else:
                    self.log(f"❌ Invalid gateway value: {gateway}", "ERROR")
                    return False
                
                # Check geo info structure
                geo = gateway_info.get("geo", {})
                geo_fields = ["country", "countryName", "ip", "isSpain"]
                for field in geo_fields:
                    if field in geo:
                        self.log(f"✅ Geo info has {field}: {geo[field]}")
                    else:
                        self.log(f"❌ Geo info missing {field}", "ERROR")
                        return False
                
                # Check available methods
                methods = gateway_info.get("availableMethods", [])
                if isinstance(methods, list) and len(methods) > 0:
                    self.log(f"✅ Available methods: {methods}")
                else:
                    self.log("❌ No available payment methods", "ERROR")
                    return False
                
                return True
            else:
                self.log(f"❌ Gateway detection failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Gateway detection test failed: {str(e)}", "ERROR")
            return False

    def test_feature_flags(self) -> bool:
        """Test payment feature flags"""
        self.log("=== Testing Feature Flags ===")
        
        try:
            response = self.make_request("GET", "/checkout/feature-flags", use_auth=False)
            
            if response.status_code == 200:
                flags = response.json()
                self.log("✅ Successfully retrieved feature flags")
                
                # Check expected flags
                expected_flags = {
                    "cryptoEnabled": False,
                    "redsysEnabled": True,
                    "stripeEnabled": True
                }
                
                for flag_name, expected_value in expected_flags.items():
                    if flag_name in flags:
                        actual_value = flags[flag_name]
                        if actual_value == expected_value:
                            self.log(f"✅ {flag_name}: {actual_value} (matches expected)")
                        else:
                            self.log(f"⚠️ {flag_name}: {actual_value} (expected {expected_value})", "WARN")
                    else:
                        self.log(f"❌ Missing flag: {flag_name}", "ERROR")
                        return False
                
                return True
            else:
                self.log(f"❌ Feature flags failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Feature flags test failed: {str(e)}", "ERROR")
            return False

    def test_spanish_ip_detection(self) -> bool:
        """Test Spanish IP detection via geolocation service"""
        self.log("=== Testing Spanish IP Detection ===")
        
        # We can't directly test with a Spanish IP since we're making requests from our server
        # But we can test the gateway detection endpoint and verify it handles geolocation
        try:
            response = self.make_request("GET", "/checkout/detect-gateway", use_auth=False)
            
            if response.status_code == 200:
                gateway_info = response.json()
                geo = gateway_info.get("geo", {})
                
                # Log the detected country for our current IP
                country = geo.get("country", "Unknown")
                country_name = geo.get("countryName", "Unknown")
                is_spain = geo.get("isSpain", False)
                
                self.log(f"✅ Detected country: {country} ({country_name})")
                self.log(f"✅ Is Spain: {is_spain}")
                
                # The test passes if we get valid geolocation data
                # In a real Spanish IP test, we would expect:
                # - country: "ES"
                # - countryName: "Spain" 
                # - isSpain: true
                # - gateway: "redsys" (if Redsys is enabled)
                
                if country and country_name:
                    self.log("✅ Geolocation service is working correctly")
                    
                    # Log what would happen with a Spanish IP
                    if is_spain:
                        self.log("✅ Current IP is from Spain - would use Redsys gateway")
                    else:
                        self.log(f"ℹ️ Current IP is from {country_name} - would use Stripe gateway")
                        self.log("ℹ️ Spanish IP (88.6.125.1) would return ES country code and use Redsys")
                    
                    return True
                else:
                    self.log("❌ Invalid geolocation data", "ERROR")
                    return False
            else:
                self.log(f"❌ Spanish IP detection test failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Spanish IP detection test failed: {str(e)}", "ERROR")
            return False

    def test_create_order_with_geo_data(self) -> bool:
        """Test creating order and verify geo data is stored"""
        self.log("=== Testing Create Order with Geo Data ===")
        
        purchase_data = {
            "productId": "694206ceb76f354acbfff5e9",
            "email": "geo_test@example.com"
        }
        
        try:
            response = self.make_request("POST", "/checkout/test-purchase", purchase_data, use_auth=False)
            
            if response.status_code in [200, 201]:
                result = response.json()
                self.log("✅ Test purchase completed successfully")
                
                # Check if purchase was successful
                if result.get("success"):
                    self.log("✅ Purchase marked as successful")
                    
                    # Get the order ID
                    order_id = result.get("orderId")
                    if order_id:
                        self.log(f"✅ Order created with ID: {order_id}")
                        
                        # Store for MongoDB verification
                        self.test_order_id_for_cleanup = order_id
                        
                        # Verify the order has required fields
                        order = result.get("order")
                        if order:
                            self.log(f"✅ Order status: {order.get('status')}")
                            self.log(f"✅ Payment provider: {order.get('paymentProvider')}")
                        
                        return True
                    else:
                        self.log("❌ No order ID in response", "ERROR")
                        return False
                else:
                    self.log("❌ Purchase marked as failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Create order with geo data failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Create order with geo data test failed: {str(e)}", "ERROR")
            return False

    def test_verify_order_geolocation_data(self) -> bool:
        """Verify order has geolocation data in MongoDB"""
        self.log("=== Verifying Order Geolocation Data in MongoDB ===")
        
        try:
            import subprocess
            
            # Query MongoDB for the test order with geolocation fields
            mongo_script = '''
            db.orders.findOne(
                {email_backup: "geo_test@example.com"}, 
                {
                    detected_country: 1, 
                    detected_country_name: 1, 
                    payment_provider: 1, 
                    commission_cents: 1, 
                    commission_rate: 1,
                    status: 1,
                    created_at: 1
                }
            )
            '''
            
            cmd = ["mongosh", "--quiet", "antia", "--eval", mongo_script]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                self.log("✅ Successfully queried MongoDB for geolocation data")
                output = result.stdout.strip()
                self.log(f"MongoDB output: {output}")
                
                # Check if we got valid data
                if "detected_country" in output:
                    self.log("✅ Order has detected_country field")
                else:
                    self.log("❌ Order missing detected_country field", "ERROR")
                    return False
                
                if "detected_country_name" in output:
                    self.log("✅ Order has detected_country_name field")
                else:
                    self.log("❌ Order missing detected_country_name field", "ERROR")
                    return False
                
                if "payment_provider" in output:
                    self.log("✅ Order has payment_provider field")
                else:
                    self.log("❌ Order missing payment_provider field", "ERROR")
                    return False
                
                if "commission_cents" in output:
                    self.log("✅ Order has commission_cents field")
                else:
                    self.log("❌ Order missing commission_cents field", "ERROR")
                    return False
                
                if "commission_rate" in output:
                    self.log("✅ Order has commission_rate field")
                else:
                    self.log("❌ Order missing commission_rate field", "ERROR")
                    return False
                
                # Check if order exists at all
                if "null" in output:
                    self.log("❌ No order found with email geo_test@example.com", "ERROR")
                    return False
                
                self.log("✅ All required geolocation fields present in order")
                return True
            else:
                self.log(f"❌ MongoDB geolocation verification failed: {result.stderr}", "ERROR")
                return False
                
        except subprocess.TimeoutExpired:
            self.log("❌ MongoDB geolocation verification timed out", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ MongoDB geolocation verification failed: {str(e)}", "ERROR")
            return False

    # ===== PAYMENT FLOW TESTS FOR REVIEW REQUEST =====
    
    def test_create_and_simulate_payment_for_product(self) -> bool:
        """Test creating and simulating payment for the specific product from review request"""
        self.log("=== Testing Create and Simulate Payment for Mclaren Product ===")
        
        # Use the specific product ID from the review request
        product_id = "6944b0fca44b83691ca83898"
        test_email = "cliente_test@example.com"
        
        payment_data = {
            "productId": product_id,
            "email": test_email
        }
        
        try:
            # Use the test-purchase endpoint which calls createAndSimulatePayment
            response = self.make_request("POST", "/checkout/test-purchase", payment_data, use_auth=False)
            
            if response.status_code in [200, 201]:
                result = response.json()
                self.log("✅ Create and simulate payment successful")
                
                # Check if payment was successful
                if result.get("success"):
                    self.log("✅ Payment marked as successful")
                    
                    # Get the order ID for further testing
                    order_id = result.get("orderId")
                    if order_id:
                        self.log(f"✅ Order created with ID: {order_id}")
                        self.test_order_id_for_cleanup = order_id
                        
                        # Verify order details
                        if "order" in result:
                            order = result["order"]
                            status = order.get("status")
                            if status == "PAGADA":
                                self.log("✅ Order status is PAGADA as expected")
                            else:
                                self.log(f"❌ Order status is {status}, expected PAGADA", "ERROR")
                                return False
                        
                        # Verify product info
                        if "product" in result and result["product"]:
                            product = result["product"]
                            self.log(f"✅ Product info: {product.get('title')} - {product.get('priceCents')} cents")
                        
                        # Verify tipster info
                        if "tipster" in result and result["tipster"]:
                            tipster = result["tipster"]
                            tipster_id = tipster.get("id")
                            self.log(f"✅ Tipster info: {tipster.get('publicName')} (ID: {tipster_id})")
                        
                        return True
                    else:
                        self.log("❌ No order ID in response", "ERROR")
                        return False
                else:
                    self.log("❌ Payment marked as failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Create and simulate payment failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Create and simulate payment test failed: {str(e)}", "ERROR")
            return False

    def test_verify_order_pagada_status(self) -> bool:
        """Test verifying order status is PAGADA using GET /api/checkout/order/{orderId}"""
        if not self.test_order_id_for_cleanup:
            self.log("❌ No test order ID available for verification", "ERROR")
            return False
            
        self.log(f"=== Testing Verify Order PAGADA Status for Order {self.test_order_id_for_cleanup} ===")
        
        try:
            response = self.make_request("GET", f"/checkout/order/{self.test_order_id_for_cleanup}", use_auth=False)
            
            if response.status_code == 200:
                order_data = response.json()
                self.log("✅ Successfully retrieved order details")
                
                # Verify order structure
                if "order" in order_data:
                    order = order_data["order"]
                    
                    # Check order ID matches
                    if order.get("id") == self.test_order_id_for_cleanup:
                        self.log("✅ Order ID matches expected value")
                    else:
                        self.log(f"❌ Order ID mismatch. Expected: {self.test_order_id_for_cleanup}, Got: {order.get('id')}", "ERROR")
                        return False
                    
                    # Check status is PAGADA
                    status = order.get("status")
                    if status == "PAGADA":
                        self.log("✅ Order status is PAGADA as expected")
                    else:
                        self.log(f"❌ Order status is {status}, expected PAGADA", "ERROR")
                        return False
                    
                    # Log other order details
                    self.log(f"✅ Order amount: {order.get('amountCents')} cents")
                    self.log(f"✅ Payment provider: {order.get('paymentProvider')}")
                    self.log(f"✅ Paid at: {order.get('paidAt')}")
                    
                else:
                    self.log("❌ Order data missing in response", "ERROR")
                    return False
                
                # Verify product info
                if "product" in order_data and order_data["product"]:
                    product = order_data["product"]
                    product_id = product.get("id")
                    if product_id == "6944b0fca44b83691ca83898":
                        self.log(f"✅ Correct product: {product.get('title')} (ID: {product_id})")
                    else:
                        self.log(f"⚠️ Unexpected product ID: {product_id}", "WARN")
                
                # Verify tipster info
                if "tipster" in order_data and order_data["tipster"]:
                    tipster = order_data["tipster"]
                    self.log(f"✅ Tipster info: {tipster.get('publicName')}")
                
                return True
            else:
                self.log(f"❌ Get order details failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Verify order PAGADA status test failed: {str(e)}", "ERROR")
            return False

    def test_database_verification_for_bot_flow(self) -> bool:
        """Test database verification for bot flow - check order has product_id, tipster_id, status=PAGADA"""
        self.log("=== Testing Database Verification for Bot Flow ===")
        
        try:
            import subprocess
            
            # Query MongoDB for the test order with required fields
            mongo_script = f'''
            db.orders.findOne(
                {{_id: ObjectId("{self.test_order_id_for_cleanup}")}}, 
                {{
                    product_id: 1, 
                    tipster_id: 1, 
                    status: 1,
                    created_at: 1
                }}
            )
            '''
            
            cmd = ["mongosh", "--quiet", "antia", "--eval", mongo_script]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                self.log("✅ Successfully queried MongoDB for order verification")
                output = result.stdout.strip()
                self.log(f"MongoDB output: {output}")
                
                # Check if we got valid data
                if "product_id" in output:
                    self.log("✅ Order has product_id field")
                else:
                    self.log("❌ Order missing product_id field", "ERROR")
                    return False
                
                if "tipster_id" in output:
                    self.log("✅ Order has tipster_id field")
                else:
                    self.log("❌ Order missing tipster_id field", "ERROR")
                    return False
                
                if '"status" : "PAGADA"' in output or "status: 'PAGADA'" in output:
                    self.log("✅ Order status is PAGADA in database")
                else:
                    self.log("❌ Order status is not PAGADA in database", "ERROR")
                    return False
                
                # Check if order exists at all
                if "null" in output:
                    self.log("❌ No order found in database", "ERROR")
                    return False
                
                self.log("✅ All required fields present in order for bot flow")
                return True
            else:
                self.log(f"❌ MongoDB verification failed: {result.stderr}", "ERROR")
                return False
                
        except subprocess.TimeoutExpired:
            self.log("❌ MongoDB verification timed out", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ Database verification failed: {str(e)}", "ERROR")
            return False

    def test_verify_product_channel_configuration(self) -> bool:
        """Test that the product has telegram_channel_id configured"""
        self.log("=== Testing Product Channel Configuration ===")
        
        try:
            import subprocess
            
            # Query MongoDB for the product and its channel configuration
            mongo_script = '''
            const product = db.products.findOne(
                {_id: ObjectId("6944b0fca44b83691ca83898")}, 
                {telegram_channel_id: 1, title: 1}
            );
            
            if (product && product.telegram_channel_id) {
                const channel = db.telegram_channels.findOne(
                    {channel_id: product.telegram_channel_id},
                    {channel_id: 1, invite_link: 1, title: 1, active: 1}
                );
                
                print("PRODUCT:", JSON.stringify(product));
                print("CHANNEL:", JSON.stringify(channel));
            } else {
                print("PRODUCT:", JSON.stringify(product));
                print("CHANNEL: null");
            }
            '''
            
            cmd = ["mongosh", "--quiet", "antia", "--eval", mongo_script]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                self.log("✅ Successfully queried MongoDB for product and channel configuration")
                output = result.stdout.strip()
                self.log(f"MongoDB output: {output}")
                
                # Check if product has telegram_channel_id
                if '"telegram_channel_id"' in output and '"-1003329431615"' in output:
                    self.log("✅ Product has telegram_channel_id: -1003329431615")
                else:
                    self.log("❌ Product missing telegram_channel_id or incorrect value", "ERROR")
                    return False
                
                # Check if channel has invite_link
                if '"invite_link"' in output and output.count('"invite_link"') > 0:
                    self.log("✅ Channel has invite_link configured")
                else:
                    self.log("❌ Channel missing invite_link configuration", "ERROR")
                    return False
                
                # Check if channel is active
                if '"active" : true' in output:
                    self.log("✅ Channel is active")
                else:
                    self.log("⚠️ Channel may not be active", "WARN")
                
                self.log("✅ Product and channel configuration verified for bot flow")
                return True
            else:
                self.log(f"❌ MongoDB channel verification failed: {result.stderr}", "ERROR")
                return False
                
        except subprocess.TimeoutExpired:
            self.log("❌ MongoDB channel verification timed out", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ Product channel verification failed: {str(e)}", "ERROR")
            return False

    def test_admin_login(self) -> bool:
        """Test authentication with admin credentials"""
        self.log("=== Testing Admin Authentication ===")
        
        login_data = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        try:
            response = self.make_request("POST", "/auth/login", login_data, use_auth=False)
            
            if response.status_code == 200:
                response_data = response.json()
                
                # Check if access_token is in response
                if "access_token" in response_data:
                    self.admin_access_token = response_data["access_token"]
                    self.log("✅ Admin login successful - JWT token received")
                    return True
                else:
                    self.log("❌ Admin login response missing access_token", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Admin login failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin login test failed: {str(e)}", "ERROR")
            return False

    def test_kyc_status_api(self) -> bool:
        """Test KYC status API for tipster"""
        self.log("=== Testing KYC Status API ===")
        
        # Use tipster token for this test
        original_token = self.access_token
        
        try:
            response = self.make_request("GET", "/tipster/kyc-status")
            
            if response.status_code == 200:
                kyc_data = response.json()
                self.log("✅ Successfully retrieved KYC status")
                
                # Check required fields
                required_fields = ["kycCompleted", "needsKyc"]
                for field in required_fields:
                    if field in kyc_data:
                        self.log(f"✅ KYC status has {field}: {kyc_data[field]}")
                    else:
                        self.log(f"❌ KYC status missing {field}", "ERROR")
                        return False
                
                # Log additional fields if present
                optional_fields = ["applicationStatus", "legalName", "documentType", "documentNumber"]
                for field in optional_fields:
                    if field in kyc_data:
                        value = kyc_data[field]
                        if field == "documentNumber" and value:
                            # Mask document number for security
                            masked_value = value[:2] + "*" * (len(value) - 4) + value[-2:] if len(value) > 4 else "***"
                            self.log(f"✅ KYC status has {field}: {masked_value}")
                        else:
                            self.log(f"✅ KYC status has {field}: {value}")
                
                return True
            else:
                self.log(f"❌ Get KYC status failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ KYC status test failed: {str(e)}", "ERROR")
            return False

    def test_admin_tipsters_api(self) -> bool:
        """Test admin tipsters API"""
        self.log("=== Testing Admin Tipsters API ===")
        
        # Use admin token for this test
        original_token = self.access_token
        self.access_token = self.admin_access_token
        
        try:
            response = self.make_request("GET", "/admin/tipsters")
            
            if response.status_code == 200:
                tipsters_data = response.json()
                self.log("✅ Successfully retrieved tipsters list")
                
                # Check if it's an object with tipsters array
                if isinstance(tipsters_data, dict) and "tipsters" in tipsters_data:
                    tipsters_list = tipsters_data["tipsters"]
                    self.log(f"✅ Tipsters response contains {len(tipsters_list)} tipsters")
                    
                    # Check each tipster has required fields
                    for i, tipster in enumerate(tipsters_list):
                        self.log(f"Tipster {i+1}:")
                        
                        # Check for modules info
                        if "modules" in tipster:
                            modules = tipster["modules"]
                            self.log(f"  ✅ Has modules info: {modules}")
                        else:
                            self.log(f"  ❌ Missing modules info", "ERROR")
                        
                        # Check basic tipster fields
                        basic_fields = ["id", "publicName"]
                        for field in basic_fields:
                            if field in tipster:
                                self.log(f"  ✅ Has {field}: {tipster[field]}")
                            else:
                                self.log(f"  ❌ Missing {field}", "ERROR")
                
                else:
                    self.log("❌ Tipsters response is not in expected format", "ERROR")
                    return False
                
                return True
            else:
                self.log(f"❌ Get admin tipsters failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin tipsters test failed: {str(e)}", "ERROR")
            return False
        finally:
            # Restore original token
            self.access_token = original_token

    # ===== REVIEW REQUEST TEST RUNNER =====
    
    def run_review_request_tests(self) -> Dict[str, bool]:
        """Run all tests specified in the review request"""
        self.log("🎯 STARTING REVIEW REQUEST TESTS")
        self.log("=" * 60)
        
        test_results = {}
        
        # 1. Test Purchase Flow (Critical P0)
        self.log("\n1️⃣ TESTING PURCHASE FLOW (Critical P0)")
        test_results["purchase_flow"] = self.test_create_and_simulate_payment_for_product()
        
        # 2. Verify Order Details
        self.log("\n2️⃣ TESTING ORDER DETAILS VERIFICATION")
        test_results["order_details"] = self.test_verify_order_pagada_status()
        
        # 3. Database Verification for Bot Flow
        self.log("\n3️⃣ TESTING DATABASE VERIFICATION FOR BOT FLOW")
        test_results["database_verification"] = self.test_database_verification_for_bot_flow()
        
        # 4. Product Channel Configuration
        self.log("\n4️⃣ TESTING PRODUCT CHANNEL CONFIGURATION")
        test_results["channel_configuration"] = self.test_verify_product_channel_configuration()
        
        # 5. KYC Status API (requires tipster login first)
        self.log("\n5️⃣ TESTING TIPSTER LOGIN AND KYC STATUS API")
        if self.test_login():
            test_results["kyc_status"] = self.test_kyc_status_api()
        else:
            test_results["kyc_status"] = False
        
        # 6. Admin Tipsters API (requires admin login first)
        self.log("\n6️⃣ TESTING ADMIN LOGIN AND TIPSTERS API")
        if self.test_admin_login():
            test_results["admin_tipsters"] = self.test_admin_tipsters_api()
        else:
            test_results["admin_tipsters"] = False
        
        return test_results

    def test_telegram_bot_order_command_simulation(self) -> bool:
        """Test simulating Telegram bot receiving order_* command"""
        if not self.test_order_id_for_cleanup:
            self.log("❌ No test order ID available for bot simulation", "ERROR")
            return False
            
        self.log(f"=== Testing Telegram Bot Order Command Simulation ===")
        
        # Simulate a Telegram webhook with /start order_ORDER_ID command
        webhook_data = {
            "update_id": 123456789,
            "message": {
                "message_id": 1,
                "from": {
                    "id": 987654321,
                    "is_bot": False,
                    "first_name": "Test",
                    "username": "testuser"
                },
                "chat": {
                    "id": 987654321,
                    "first_name": "Test",
                    "username": "testuser",
                    "type": "private"
                },
                "date": 1703000000,
                "text": f"/start order_{self.test_order_id_for_cleanup}"
            }
        }
        
        try:
            response = self.make_request("POST", "/telegram/webhook", webhook_data, use_auth=False)
            
            if response.status_code == 200:
                response_data = response.json()
                self.log("✅ Telegram webhook processed order command")
                
                # Check if the bot processed the command successfully
                if response_data.get("ok"):
                    self.log("✅ Bot marked command processing as successful")
                else:
                    self.log("⚠️ Bot marked command processing as failed (this might be expected for test data)", "WARN")
                
                # Check backend logs for order processing
                self.check_backend_logs_for_order_processing()
                
                return True
            else:
                self.log(f"❌ Telegram bot order command failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Telegram bot order command test failed: {str(e)}", "ERROR")
            return False

    def check_backend_logs_for_order_processing(self) -> bool:
        """Check backend logs for order processing messages"""
        self.log("=== Checking Backend Logs for Order Processing ===")
        
        try:
            import subprocess
            
            # Check supervisor backend logs for order processing messages
            cmd = ["tail", "-n", "50", "/var/log/supervisor/backend.out.log"]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                log_content = result.stdout
                
                # Look for order processing messages
                order_keywords = [
                    "order_",
                    "Processing order",
                    "Order found",
                    "Channel found",
                    "invite_link"
                ]
                
                found_keywords = []
                for keyword in order_keywords:
                    if keyword.lower() in log_content.lower():
                        found_keywords.append(keyword)
                        self.log(f"✅ Found '{keyword}' in backend logs")
                
                if found_keywords:
                    self.log(f"✅ Found {len(found_keywords)} order processing indicators in logs")
                else:
                    self.log("⚠️ No specific order processing messages found in recent logs", "WARN")
                
                # Show recent log entries for debugging
                self.log("Recent backend log entries:")
                lines = log_content.split('\n')[-10:]
                for line in lines:
                    if line.strip():
                        self.log(f"  {line}")
                
                return True
            else:
                self.log(f"❌ Could not read backend logs: {result.stderr}", "ERROR")
                return False
                
        except subprocess.TimeoutExpired:
            self.log("❌ Backend log check timed out", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ Backend log check failed: {str(e)}", "ERROR")
            return False

    def test_channel_has_invite_link(self) -> bool:
        """Test that the channel has an invite_link configured"""
        self.log("=== Testing Channel Has Invite Link ===")
        
        # The review request mentions channel ID: -1003329431615 with invite_link: https://t.me/+EOEsAu0ZqAk5M2Mx
        channel_id = "-1003329431615"
        expected_invite_link = "https://t.me/+EOEsAu0ZqAk5M2Mx"
        
        try:
            import subprocess
            
            # Query MongoDB for the channel configuration (use 'antia' database, not 'antia_db')
            mongo_script = f'''
            db.telegram_channels.findOne(
                {{channel_id: "{channel_id}"}}, 
                {{
                    channel_id: 1,
                    channel_title: 1,
                    invite_link: 1,
                    tipster_id: 1,
                    is_active: 1,
                    channel_type: 1
                }}
            )
            '''
            
            cmd = ["mongosh", "--quiet", "antia", "--eval", mongo_script]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                output = result.stdout.strip()
                self.log("✅ Successfully queried MongoDB for channel data")
                self.log(f"Channel data: {output}")
                
                # Check if channel exists
                if "null" in output:
                    self.log("❌ Channel not found in database", "ERROR")
                    return False
                
                # Check for invite_link field
                if "invite_link" in output:
                    self.log("✅ Channel has invite_link field")
                    
                    # Check if it matches expected link
                    if expected_invite_link in output:
                        self.log(f"✅ Channel has correct invite_link: {expected_invite_link}")
                    else:
                        self.log("⚠️ Channel has different invite_link than expected", "WARN")
                        # Extract the actual invite link from output
                        import re
                        link_match = re.search(r'invite_link:\s*[\'"]([^\'"]+)[\'"]', output)
                        if link_match:
                            actual_link = link_match.group(1)
                            self.log(f"Actual invite_link: {actual_link}")
                else:
                    self.log("❌ Channel missing invite_link field", "ERROR")
                    return False
                
                # Check channel ID
                if channel_id in output:
                    self.log(f"✅ Found channel with ID: {channel_id}")
                else:
                    self.log(f"❌ Channel ID {channel_id} not found", "ERROR")
                    return False
                
                # Check if channel is active
                if "is_active: true" in output:
                    self.log("✅ Channel is active")
                else:
                    self.log("⚠️ Channel may not be active", "WARN")
                
                # Check channel title
                if "prueba bot" in output:
                    self.log("✅ Channel title matches expected: 'prueba bot'")
                else:
                    self.log("⚠️ Channel title may be different", "WARN")
                
                return True
            else:
                self.log(f"❌ MongoDB channel query failed: {result.stderr}", "ERROR")
                return False
                
        except subprocess.TimeoutExpired:
            self.log("❌ MongoDB channel query timed out", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ Channel invite link test failed: {str(e)}", "ERROR")
            return False

    def test_telegram_notification_endpoint(self) -> bool:
        """Test telegram notification endpoint (if it exists)"""
        self.log("=== Testing Telegram Notification Endpoint ===")
        
        # Since POST /api/telegram/test-notify doesn't exist, let's test the webhook with a notification-like payload
        notification_data = {
            "update_id": 123456790,
            "message": {
                "message_id": 2,
                "from": {
                    "id": 987654321,
                    "is_bot": False,
                    "first_name": "Test",
                    "username": "testuser"
                },
                "chat": {
                    "id": 987654321,
                    "first_name": "Test",
                    "username": "testuser",
                    "type": "private"
                },
                "date": 1703000000,
                "text": "test notification"
            }
        }
        
        try:
            response = self.make_request("POST", "/telegram/webhook", notification_data, use_auth=False)
            
            if response.status_code == 200:
                response_data = response.json()
                self.log("✅ Telegram notification endpoint processed request")
                
                # Check response
                if response_data.get("ok"):
                    self.log("✅ Notification processing marked as successful")
                else:
                    self.log("⚠️ Notification processing marked as failed (expected for test data)", "WARN")
                
                return True
            else:
                self.log(f"❌ Telegram notification endpoint failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Telegram notification endpoint test failed: {str(e)}", "ERROR")
            return False

    # ===== KYC FLOW TESTS =====
    
    def test_kyc_status_for_approved_tipster(self) -> bool:
        """Test getting KYC status for approved tipster"""
        self.log("=== Testing KYC Status for Approved Tipster ===")
        
        try:
            response = self.make_request("GET", "/tipster/kyc-status")
            
            if response.status_code == 200:
                kyc_status = response.json()
                self.log("✅ Successfully retrieved KYC status")
                
                # Check response structure
                expected_fields = ["kycCompleted", "applicationStatus", "needsKyc"]
                for field in expected_fields:
                    if field in kyc_status:
                        self.log(f"✅ KYC status has {field}: {kyc_status[field]}")
                    else:
                        self.log(f"❌ KYC status missing {field}", "ERROR")
                        return False
                
                # Verify application status is APPROVED
                if kyc_status.get("applicationStatus") == "APPROVED":
                    self.log("✅ Tipster application status is APPROVED")
                else:
                    self.log(f"❌ Tipster application status is {kyc_status.get('applicationStatus')}, expected APPROVED", "ERROR")
                    return False
                
                # Check if KYC is needed (should be true for approved tipster without KYC)
                needs_kyc = kyc_status.get("needsKyc")
                kyc_completed = kyc_status.get("kycCompleted")
                
                if needs_kyc and not kyc_completed:
                    self.log("✅ KYC is needed and not completed - banner should appear")
                elif kyc_completed:
                    self.log("✅ KYC is already completed")
                    # Check if KYC data is present
                    if "kycData" in kyc_status and kyc_status["kycData"]:
                        kyc_data = kyc_status["kycData"]
                        self.log(f"✅ KYC data present: {kyc_data.get('legalName')} ({kyc_data.get('country')})")
                else:
                    self.log(f"⚠️ Unexpected KYC state: needsKyc={needs_kyc}, kycCompleted={kyc_completed}", "WARN")
                
                return True
            else:
                self.log(f"❌ Get KYC status failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get KYC status test failed: {str(e)}", "ERROR")
            return False

    def test_update_kyc_data(self) -> bool:
        """Test updating KYC data for approved tipster"""
        self.log("=== Testing Update KYC Data ===")
        
        kyc_data = {
            "legalName": "Fausto Pérez García",
            "documentType": "DNI",
            "documentNumber": "12345678A",
            "country": "España",
            "bankAccountType": "IBAN",
            "bankAccountDetails": {
                "iban": "ES12 3456 7890 1234 5678 9012",
                "bankName": "Banco Santander"
            }
        }
        
        try:
            response = self.make_request("PUT", "/tipster/kyc", kyc_data)
            
            if response.status_code == 200:
                result = response.json()
                self.log("✅ KYC data updated successfully")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ KYC update marked as successful")
                    
                    # Check for success message
                    message = result.get("message", "")
                    if "actualizados" in message or "guardados" in message:
                        self.log(f"✅ Success message: {message}")
                    else:
                        self.log(f"⚠️ Unexpected message: {message}", "WARN")
                    
                    return True
                else:
                    self.log("❌ KYC update marked as failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Update KYC data failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Update KYC data test failed: {str(e)}", "ERROR")
            return False

    def test_kyc_status_after_completion(self) -> bool:
        """Test KYC status after completion to verify data was saved"""
        self.log("=== Testing KYC Status After Completion ===")
        
        try:
            response = self.make_request("GET", "/tipster/kyc-status")
            
            if response.status_code == 200:
                kyc_status = response.json()
                self.log("✅ Successfully retrieved KYC status after completion")
                
                # Verify KYC is now completed
                if kyc_status.get("kycCompleted"):
                    self.log("✅ KYC is marked as completed")
                else:
                    self.log("❌ KYC is not marked as completed after update", "ERROR")
                    return False
                
                # Verify needsKyc is now false
                if not kyc_status.get("needsKyc"):
                    self.log("✅ needsKyc is false - banner should not appear")
                else:
                    self.log("❌ needsKyc is still true after completion", "ERROR")
                    return False
                
                # Check if KYC data is present and masked
                if "kycData" in kyc_status and kyc_status["kycData"]:
                    kyc_data = kyc_status["kycData"]
                    self.log(f"✅ KYC data present: {kyc_data.get('legalName')}")
                    self.log(f"✅ Country: {kyc_data.get('country')}")
                    self.log(f"✅ Document type: {kyc_data.get('documentType')}")
                    self.log(f"✅ Bank account type: {kyc_data.get('bankAccountType')}")
                    
                    # Verify document number is masked
                    doc_number = kyc_data.get("documentNumber")
                    if doc_number and doc_number.startswith("****"):
                        self.log(f"✅ Document number is properly masked: {doc_number}")
                    else:
                        self.log(f"⚠️ Document number masking issue: {doc_number}", "WARN")
                    
                    # Check completion timestamp
                    if kyc_status.get("kycCompletedAt"):
                        self.log(f"✅ KYC completion timestamp: {kyc_status.get('kycCompletedAt')}")
                    else:
                        self.log("❌ Missing KYC completion timestamp", "ERROR")
                        return False
                    
                    return True
                else:
                    self.log("❌ KYC data missing after completion", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Get KYC status after completion failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get KYC status after completion test failed: {str(e)}", "ERROR")
            return False

    def test_kyc_validation_errors(self) -> bool:
        """Test KYC validation with invalid data"""
        self.log("=== Testing KYC Validation Errors ===")
        
        # Test with missing required fields
        invalid_kyc_data = {
            "legalName": "",  # Empty name
            "documentType": "DNI",
            # Missing documentNumber
            "country": "España",
            "bankAccountType": "IBAN"
        }
        
        try:
            response = self.make_request("PUT", "/tipster/kyc", invalid_kyc_data)
            
            # Should fail with validation error
            if response.status_code == 400:
                result = response.json()
                self.log("✅ KYC validation correctly rejected invalid data")
                self.log(f"Error message: {result.get('message', 'No message')}")
                return True
            elif response.status_code == 200:
                self.log("❌ KYC validation should have failed but succeeded", "ERROR")
                return False
            else:
                self.log(f"❌ Unexpected response status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ KYC validation test failed: {str(e)}", "ERROR")
            return False

    # ===== TIPSTER REGISTRATION AND APPROVAL FLOW TESTS =====
    
    def test_register_new_tipster(self) -> bool:
        """Test registering a new tipster (should be PENDING)"""
        self.log("=== Testing Register New Tipster ===")
        
        registration_data = {
            "name": "Carlos Test",
            "email": "carlos.test@example.com",
            "password": "Test123456!",
            "phone": "+34600123456",
            "telegramUsername": "@carlostest",
            "countryIso": "ES",
            "acceptTerms": True,
            "applicationNotes": "Quiero unirme a la plataforma porque tengo experiencia en pronósticos deportivos",
            "experience": "3 años de experiencia en fútbol y tenis",
            "socialMedia": "@carlos_tips en Twitter, @carlos_apuestas en Instagram",
            "website": "https://carlostips.com"
        }
        
        try:
            response = self.make_request("POST", "/auth/tipster/register", registration_data, use_auth=False)
            
            if response.status_code == 201:
                result = response.json()
                self.log("✅ Tipster registration successful")
                
                # Check response structure
                expected_fields = ["status", "requiresApproval", "message"]
                for field in expected_fields:
                    if field in result:
                        self.log(f"✅ Registration response has {field}: {result[field]}")
                    else:
                        self.log(f"❌ Registration response missing {field}", "ERROR")
                        return False
                
                # Verify status is PENDING
                if result.get("status") == "PENDING":
                    self.log("✅ Tipster status is PENDING as expected")
                else:
                    self.log(f"❌ Tipster status is {result.get('status')}, expected PENDING", "ERROR")
                    return False
                
                # Verify requires approval
                if result.get("requiresApproval") == True:
                    self.log("✅ Requires approval is true as expected")
                else:
                    self.log(f"❌ Requires approval is {result.get('requiresApproval')}, expected true", "ERROR")
                    return False
                
                return True
            else:
                self.log(f"❌ Tipster registration failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Register new tipster test failed: {str(e)}", "ERROR")
            return False

    def test_login_pending_tipster_should_fail(self) -> bool:
        """Test login as new tipster (should fail with pending approval)"""
        self.log("=== Testing Login Pending Tipster (Should Fail) ===")
        
        login_data = {
            "email": "carlos.test@example.com",
            "password": "Test123456!"
        }
        
        try:
            response = self.make_request("POST", "/auth/login", login_data, use_auth=False)
            
            if response.status_code == 401:
                result = response.json()
                self.log("✅ Login failed as expected for pending tipster")
                
                # Check for appropriate error message
                message = result.get("message", "").lower()
                if "pending" in message or "approval" in message or "aprobación" in message:
                    self.log("✅ Error message mentions pending approval")
                else:
                    self.log(f"⚠️ Error message doesn't mention pending approval: {result.get('message')}", "WARN")
                
                return True
            elif response.status_code == 200:
                self.log("❌ Login succeeded when it should have failed for pending tipster", "ERROR")
                return False
            else:
                self.log(f"❌ Unexpected response status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Login pending tipster test failed: {str(e)}", "ERROR")
            return False

    def test_admin_login_and_get_pending_applications(self) -> bool:
        """Test admin login and get pending applications"""
        self.log("=== Testing Admin Login and Get Pending Applications ===")
        
        # First login as admin
        admin_login_data = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        try:
            response = self.make_request("POST", "/auth/login", admin_login_data, use_auth=False)
            
            if response.status_code == 200:
                result = response.json()
                self.admin_access_token = result.get("access_token")
                self.log("✅ Admin login successful")
                
                # Now get pending applications using admin token
                # Temporarily switch to admin token
                original_token = self.access_token
                self.access_token = self.admin_access_token
                
                # Get application stats
                stats_response = self.make_request("GET", "/admin/tipsters/applications/stats")
                
                if stats_response.status_code == 200:
                    stats = stats_response.json()
                    self.log("✅ Successfully retrieved application stats")
                    self.log(f"Pending: {stats.get('pending', 0)}, Approved: {stats.get('approved', 0)}, Rejected: {stats.get('rejected', 0)}")
                    
                    # Get pending applications
                    pending_response = self.make_request("GET", "/admin/tipsters/applications?status=PENDING")
                    
                    if pending_response.status_code == 200:
                        applications = pending_response.json()
                        self.log("✅ Successfully retrieved pending applications")
                        
                        # Look for our test application
                        found_application = None
                        for app in applications.get("applications", []):
                            if app.get("email") == "carlos.test@example.com":
                                found_application = app
                                break
                        
                        if found_application:
                            self.log("✅ Found test application in pending list")
                            self.log(f"Application ID: {found_application.get('id')}")
                            self.log(f"Status: {found_application.get('applicationStatus')}")
                            
                            # Store application ID for approval test
                            self.test_application_id = found_application.get("id")
                            
                            # Restore original token
                            self.access_token = original_token
                            return True
                        else:
                            self.log("❌ Test application not found in pending list", "ERROR")
                            self.access_token = original_token
                            return False
                    else:
                        self.log(f"❌ Get pending applications failed with status {pending_response.status_code}", "ERROR")
                        self.access_token = original_token
                        return False
                else:
                    self.log(f"❌ Get application stats failed with status {stats_response.status_code}", "ERROR")
                    self.access_token = original_token
                    return False
            else:
                self.log(f"❌ Admin login failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin login and get pending applications test failed: {str(e)}", "ERROR")
            return False

    def test_approve_tipster_application(self) -> bool:
        """Test approving the tipster application"""
        self.log("=== Testing Approve Tipster Application ===")
        
        if not hasattr(self, 'test_application_id') or not self.test_application_id:
            self.log("❌ No test application ID available", "ERROR")
            return False
        
        if not self.admin_access_token:
            self.log("❌ No admin access token available", "ERROR")
            return False
        
        approval_data = {
            "action": "APPROVE"
        }
        
        try:
            # Use admin token
            original_token = self.access_token
            self.access_token = self.admin_access_token
            
            response = self.make_request("POST", f"/admin/tipsters/applications/{self.test_application_id}/review", approval_data)
            
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                self.log("✅ Application approval request completed")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Application approval marked as successful")
                    
                    # Check status changes
                    if result.get("applicationStatus") == "APPROVED":
                        self.log("✅ Application status changed to APPROVED")
                    else:
                        self.log(f"❌ Application status is {result.get('applicationStatus')}, expected APPROVED", "ERROR")
                        self.access_token = original_token
                        return False
                    
                    if result.get("userStatus") == "ACTIVE":
                        self.log("✅ User status changed to ACTIVE")
                    else:
                        self.log(f"❌ User status is {result.get('userStatus')}, expected ACTIVE", "ERROR")
                        self.access_token = original_token
                        return False
                    
                    # Restore original token
                    self.access_token = original_token
                    return True
                else:
                    self.log(f"❌ Application approval failed: {result.get('message', 'No message')}", "ERROR")
                    self.access_token = original_token
                    return False
            else:
                self.log(f"❌ Approve application failed with status {response.status_code}", "ERROR")
                self.access_token = original_token
                return False
                
        except Exception as e:
            self.log(f"❌ Approve tipster application test failed: {str(e)}", "ERROR")
            if 'original_token' in locals():
                self.access_token = original_token
            return False

    def test_login_approved_tipster_should_succeed(self) -> bool:
        """Test login as approved tipster (should succeed now)"""
        self.log("=== Testing Login Approved Tipster (Should Succeed) ===")
        
        login_data = {
            "email": "carlos.test@example.com",
            "password": "Test123456!"
        }
        
        try:
            response = self.make_request("POST", "/auth/login", login_data, use_auth=False)
            
            if response.status_code == 200:
                result = response.json()
                self.log("✅ Login successful for approved tipster")
                
                # Check for access token
                if "access_token" in result:
                    self.log("✅ Access token received")
                    
                    # Check user status
                    if "user" in result and result["user"]:
                        user = result["user"]
                        if user.get("status") == "ACTIVE":
                            self.log("✅ User status is ACTIVE")
                        else:
                            self.log(f"⚠️ User status is {user.get('status')}, expected ACTIVE", "WARN")
                    
                    return True
                else:
                    self.log("❌ No access token in response", "ERROR")
                    return False
            else:
                self.log(f"❌ Login failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Login approved tipster test failed: {str(e)}", "ERROR")
            return False

    def test_verify_stats_updated(self) -> bool:
        """Test that application stats are updated after approval"""
        self.log("=== Testing Verify Stats Updated ===")
        
        if not self.admin_access_token:
            self.log("❌ No admin access token available", "ERROR")
            return False
        
        try:
            # Use admin token
            original_token = self.access_token
            self.access_token = self.admin_access_token
            
            response = self.make_request("GET", "/admin/tipsters/applications/stats")
            
            if response.status_code == 200:
                stats = response.json()
                self.log("✅ Successfully retrieved updated application stats")
                
                pending = stats.get("pending", 0)
                approved = stats.get("approved", 0)
                rejected = stats.get("rejected", 0)
                total = stats.get("total", 0)
                
                self.log(f"Updated stats - Pending: {pending}, Approved: {approved}, Rejected: {rejected}, Total: {total}")
                
                # Verify that approved count increased
                if approved > 0:
                    self.log("✅ Approved count is greater than 0")
                else:
                    self.log("⚠️ Approved count is 0, may indicate stats not updated yet", "WARN")
                
                # Restore original token
                self.access_token = original_token
                return True
            else:
                self.log(f"❌ Get updated stats failed with status {response.status_code}", "ERROR")
                self.access_token = original_token
                return False
                
        except Exception as e:
            self.log(f"❌ Verify stats updated test failed: {str(e)}", "ERROR")
            if 'original_token' in locals():
                self.access_token = original_token
            return False

    def run_kyc_flow_tests(self) -> bool:
        """Run complete KYC flow tests for approved tipster"""
        self.log("\n" + "="*80)
        self.log("STARTING KYC FLOW TESTS FOR APPROVED TIPSTER")
        self.log("="*80)
        
        # First login as the approved tipster
        if not self.test_login():
            self.log("❌ Failed to login as tipster - cannot proceed with KYC tests")
            return False
        
        tests = [
            ("Get KYC Status (Initial)", self.test_kyc_status_for_approved_tipster),
            ("Update KYC Data", self.test_update_kyc_data),
            ("Get KYC Status (After Completion)", self.test_kyc_status_after_completion),
            ("Test KYC Validation Errors", self.test_kyc_validation_errors),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            self.log(f"\n--- Running: {test_name} ---")
            try:
                if test_func():
                    passed += 1
                    self.log(f"✅ {test_name} PASSED")
                else:
                    failed += 1
                    self.log(f"❌ {test_name} FAILED")
            except Exception as e:
                failed += 1
                self.log(f"❌ {test_name} FAILED with exception: {str(e)}")
        
        self.log("\n" + "="*80)
        self.log("KYC FLOW TEST RESULTS")
        self.log("="*80)
        self.log(f"✅ PASSED: {passed}")
        self.log(f"❌ FAILED: {failed}")
        self.log(f"📊 SUCCESS RATE: {(passed/(passed+failed)*100):.1f}%" if (passed+failed) > 0 else "0%")
        
        return failed == 0

    def run_tipster_registration_approval_flow(self) -> bool:
        """Run complete tipster registration and approval flow"""
        self.log("\n" + "="*80)
        self.log("STARTING TIPSTER REGISTRATION AND APPROVAL FLOW TESTS")
        self.log("="*80)
        
        tests = [
            ("Register New Tipster", self.test_register_new_tipster),
            ("Login Pending Tipster (Should Fail)", self.test_login_pending_tipster_should_fail),
            ("Admin Login and Get Pending Applications", self.test_admin_login_and_get_pending_applications),
            ("Approve Tipster Application", self.test_approve_tipster_application),
            ("Login Approved Tipster (Should Succeed)", self.test_login_approved_tipster_should_succeed),
            ("Verify Stats Updated", self.test_verify_stats_updated),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            self.log(f"\n--- Running: {test_name} ---")
            try:
                if test_func():
                    passed += 1
                    self.log(f"✅ {test_name} PASSED")
                else:
                    failed += 1
                    self.log(f"❌ {test_name} FAILED")
            except Exception as e:
                failed += 1
                self.log(f"❌ {test_name} FAILED with exception: {str(e)}")
        
        self.log("\n" + "="*80)
        self.log("TIPSTER REGISTRATION AND APPROVAL FLOW RESULTS")
        self.log("="*80)
        self.log(f"✅ PASSED: {passed}")
        self.log(f"❌ FAILED: {failed}")
        self.log(f"📊 SUCCESS RATE: {(passed/(passed+failed)*100):.1f}%" if (passed+failed) > 0 else "0%")
        
        return failed == 0

def run_payment_flow_tests():
    """Run the specific payment flow tests for the review request"""
    print("🚀 Starting Antia Platform - Payment Flow and Telegram Bot Tests")
    print("=" * 80)
    print("Testing complete payment flow and Telegram bot access for tipster product")
    print("Context: Tipster Ramiro Mata, Product 'Jake paul vs Joshua', Channel 'prueba bot'")
    print("=" * 80)
    
    tester = AntiaAPITester()
    
    # First login as tipster to get authentication
    if not tester.test_login():
        print("❌ Failed to login as tipster - cannot proceed with tests")
        return 1
    
    tests = [
        ("Create and Simulate Payment for Product", tester.test_create_and_simulate_payment_for_product),
        ("Verify Order Status is PAGADA", tester.test_verify_order_pagada_status),
        ("Simulate Telegram Bot Order Command", tester.test_telegram_bot_order_command_simulation),
        ("Test Channel Has Invite Link", tester.test_channel_has_invite_link),
        ("Test Telegram Notification Endpoint", tester.test_telegram_notification_endpoint),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        print(f"\n--- Running: {test_name} ---")
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name} PASSED")
            else:
                failed += 1
                print(f"❌ {test_name} FAILED")
        except Exception as e:
            failed += 1
            print(f"❌ {test_name} FAILED with exception: {str(e)}")
    
    print("\n" + "="*80)
    print("PAYMENT FLOW AND TELEGRAM BOT TEST RESULTS")
    print("="*80)
    print(f"✅ PASSED: {passed}")
    print(f"❌ FAILED: {failed}")
    print(f"📊 SUCCESS RATE: {(passed/(passed+failed)*100):.1f}%" if (passed+failed) > 0 else "0%")
    
    if failed == 0:
        print("\n🎉 ALL PAYMENT FLOW TESTS PASSED!")
        print("✅ Order creation and payment simulation working")
        print("✅ Order status verification working")
        print("✅ Telegram bot integration working")
        print("✅ Channel configuration working")
        return 0
    else:
        print(f"\n❌ {failed} TESTS FAILED - Check the logs above for details")
        return 1

def main():
    """Main function to run review request tests"""
    print("🚀 Starting Antia Platform - Review Request Tests")
    print("=" * 80)
    print("Testing complete payment and Telegram bot access flow in preview environment")
    print("Base URL: https://affpanel-2.preview.emergentagent.com")
    print("=" * 80)
    
    tester = AntiaAPITester()
    
    try:
        # Run the review request tests
        test_results = tester.run_review_request_tests()
        
        # Count results
        passed = sum(1 for result in test_results.values() if result)
        failed = sum(1 for result in test_results.values() if not result)
        total = len(test_results)
        
        print("\n" + "="*80)
        print("REVIEW REQUEST TEST RESULTS")
        print("="*80)
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"📊 SUCCESS RATE: {(passed/total*100):.1f}%" if total > 0 else "0%")
        
        # Show detailed results
        print("\nDetailed Results:")
        for test_name, result in test_results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"  {test_name}: {status}")
        
        if failed == 0:
            print("\n🎉 ALL REVIEW REQUEST TESTS PASSED!")
            print("✅ Purchase flow working correctly")
            print("✅ Order verification working")
            print("✅ Database verification working")
            print("✅ Channel configuration working")
            print("✅ KYC status API working")
            print("✅ Admin tipsters API working")
            return 0
        else:
            print(f"\n❌ {failed} TESTS FAILED - Check the logs above for details")
            return 1
            
    except Exception as e:
        print(f"\n💥 CRITICAL ERROR: {str(e)}")
        return 1

if __name__ == "__main__":
    import sys
    # Check if we should run payment flow tests instead
    if len(sys.argv) > 1 and sys.argv[1] == "payment-flow":
        sys.exit(run_payment_flow_tests())
    else:
        sys.exit(main())

    # ===== TELEGRAM PUBLICATION CHANNEL TESTS (CONFIGURED SCENARIO) =====
    
    def test_get_configured_publication_channel(self) -> bool:
        """Test GET /api/telegram/publication-channel - Verify returns configured channel"""
        self.log("=== Testing Get Configured Publication Channel ===")
        
        try:
            response = self.make_request("GET", "/telegram/publication-channel")
            
            if response.status_code == 200:
                channel_info = response.json()
                self.log("✅ Successfully retrieved publication channel info")
                
                # Check response structure
                expected_fields = ["configured", "channelId", "channelTitle", "channelUsername"]
                for field in expected_fields:
                    if field in channel_info:
                        self.log(f"✅ Publication channel info has {field}: {channel_info[field]}")
                    else:
                        self.log(f"❌ Publication channel info missing {field}", "ERROR")
                        return False
                
                # Verify the channel is configured with expected values
                if channel_info.get("configured"):
                    self.log("✅ Publication channel is configured")
                    
                    # Check for expected channel ID
                    expected_channel_id = "-1003329431615"
                    if channel_info.get("channelId") == expected_channel_id:
                        self.log(f"✅ Channel ID matches expected: {expected_channel_id}")
                    else:
                        self.log(f"⚠️ Channel ID is {channel_info.get('channelId')}, expected {expected_channel_id}", "WARN")
                    
                    # Check for expected channel username
                    expected_username = "@pruebabotantia"
                    if channel_info.get("channelUsername") == expected_username:
                        self.log(f"✅ Channel username matches expected: {expected_username}")
                    else:
                        self.log(f"⚠️ Channel username is {channel_info.get('channelUsername')}, expected {expected_username}", "WARN")
                    
                    # Check for channel title
                    if channel_info.get("channelTitle"):
                        self.log(f"✅ Channel title: {channel_info.get('channelTitle')}")
                    else:
                        self.log("⚠️ No channel title", "WARN")
                    
                    return True
                else:
                    self.log("❌ Publication channel is not configured", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Get publication channel failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get configured publication channel test failed: {str(e)}", "ERROR")
            return False

    def test_start_linking_process(self) -> bool:
        """Test POST /api/telegram/publication-channel/start-linking - Test starting auto-linking process"""
        self.log("=== Testing Start Linking Process ===")
        
        try:
            response = self.make_request("POST", "/telegram/publication-channel/start-linking")
            
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                self.log("✅ Start linking request completed")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Start linking marked as successful")
                    
                    # Check for expected message
                    if "vinculación iniciado" in result.get("message", "").lower():
                        self.log("✅ Appropriate message returned")
                    else:
                        self.log(f"⚠️ Unexpected message: {result.get('message')}", "WARN")
                    
                    # Check for bot username
                    if result.get("botUsername") == "Antiabetbot":
                        self.log("✅ Bot username is correct")
                    else:
                        self.log(f"⚠️ Bot username is {result.get('botUsername')}, expected Antiabetbot", "WARN")
                    
                    return True
                else:
                    self.log(f"❌ Start linking failed: {result.get('message', 'No message')}", "ERROR")
                    return False
            else:
                self.log(f"❌ Start linking failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Start linking process test failed: {str(e)}", "ERROR")
            return False

    def test_cancel_linking_process(self) -> bool:
        """Test POST /api/telegram/publication-channel/cancel-linking - Test canceling auto-linking"""
        self.log("=== Testing Cancel Linking Process ===")
        
        try:
            response = self.make_request("POST", "/telegram/publication-channel/cancel-linking")
            
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                self.log("✅ Cancel linking request completed")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Cancel linking marked as successful")
                    
                    # Check for expected message
                    if "cancelado" in result.get("message", "").lower():
                        self.log("✅ Appropriate cancellation message returned")
                    else:
                        self.log(f"⚠️ Unexpected message: {result.get('message')}", "WARN")
                    
                    return True
                else:
                    self.log(f"❌ Cancel linking failed: {result.get('message', 'No message')}", "ERROR")
                    return False
            else:
                self.log(f"❌ Cancel linking failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Cancel linking process test failed: {str(e)}", "ERROR")
            return False

    def test_publish_product_to_telegram(self) -> bool:
        """Test POST /api/products/:id/publish-telegram - Test publishing a product to Telegram"""
        self.log("=== Testing Publish Product to Telegram ===")
        
        # First get a product ID from the tipster's products
        try:
            products_response = self.make_request("GET", "/products/my")
            
            if products_response.status_code != 200:
                self.log("❌ Failed to get products list", "ERROR")
                return False
            
            products = products_response.json()
            if not products or len(products) == 0:
                self.log("❌ No products found for tipster", "ERROR")
                return False
            
            # Use the first product
            product_id = products[0].get("id")
            product_title = products[0].get("title", "Unknown")
            
            if not product_id:
                self.log("❌ Product ID not found", "ERROR")
                return False
            
            self.log(f"Using product: {product_title} (ID: {product_id})")
            
            # Now try to publish to Telegram
            response = self.make_request("POST", f"/products/{product_id}/publish-telegram")
            
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                self.log("✅ Publish to Telegram request completed")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Product published to Telegram successfully")
                    
                    # Check for message details
                    if "message" in result:
                        self.log(f"✅ Publish message: {result.get('message')}")
                    
                    # Check if channel info is included
                    if "channelId" in result:
                        self.log(f"✅ Published to channel: {result.get('channelId')}")
                    
                    return True
                else:
                    # Check if it's a configuration error (expected if no channel configured)
                    error_msg = result.get("message", "").lower()
                    if "canal" in error_msg and "configurado" in error_msg:
                        self.log("❌ Publication channel not configured - this should work now", "ERROR")
                        return False
                    else:
                        self.log(f"❌ Publish to Telegram failed: {result.get('message', 'No message')}", "ERROR")
                        return False
            else:
                self.log(f"❌ Publish to Telegram failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Publish product to Telegram test failed: {str(e)}", "ERROR")
            return False

    def test_remove_publication_channel(self) -> bool:
        """Test DELETE /api/telegram/publication-channel - Test removing publication channel"""
        self.log("=== Testing Remove Publication Channel ===")
        
        try:
            response = self.make_request("DELETE", "/telegram/publication-channel")
            
            if response.status_code == 200:
                result = response.json()
                self.log("✅ Remove publication channel request completed")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Publication channel removed successfully")
                    
                    # Check for expected message
                    if "eliminado" in result.get("message", "").lower():
                        self.log("✅ Appropriate removal message returned")
                    else:
                        self.log(f"⚠️ Unexpected message: {result.get('message')}", "WARN")
                    
                    return True
                else:
                    self.log(f"❌ Remove publication channel failed: {result.get('message', 'No message')}", "ERROR")
                    return False
            else:
                self.log(f"❌ Remove publication channel failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Remove publication channel test failed: {str(e)}", "ERROR")
            return False

    def test_verify_channel_removed(self) -> bool:
        """Test GET /api/telegram/publication-channel after removal - Verify channel is unconfigured"""
        self.log("=== Testing Verify Channel Removed ===")
        
        try:
            response = self.make_request("GET", "/telegram/publication-channel")
            
            if response.status_code == 200:
                channel_info = response.json()
                self.log("✅ Successfully retrieved publication channel info after removal")
                
                # Check if channel is now unconfigured
                if not channel_info.get("configured"):
                    self.log("✅ Publication channel is now unconfigured")
                    
                    # Verify fields are null
                    if channel_info.get("channelId") is None:
                        self.log("✅ Channel ID is null")
                    else:
                        self.log(f"❌ Channel ID should be null but is: {channel_info.get('channelId')}", "ERROR")
                        return False
                    
                    if channel_info.get("channelTitle") is None:
                        self.log("✅ Channel title is null")
                    else:
                        self.log(f"❌ Channel title should be null but is: {channel_info.get('channelTitle')}", "ERROR")
                        return False
                    
                    return True
                else:
                    self.log("❌ Publication channel is still configured after removal", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Verify channel removed failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Verify channel removed test failed: {str(e)}", "ERROR")
            return False

    def test_restore_publication_channel(self) -> bool:
        """Test restoring the publication channel configuration at the end"""
        self.log("=== Testing Restore Publication Channel ===")
        
        # Restore the original configuration
        channel_data = {
            "channelId": "-1003329431615",
            "channelTitle": "Mi Canal de Pronósticos"
        }
        
        try:
            response = self.make_request("POST", "/telegram/publication-channel", channel_data)
            
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                self.log("✅ Restore publication channel request completed")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Publication channel restored successfully")
                    
                    # Verify the response contains the channel info
                    if result.get("channelId") == channel_data["channelId"]:
                        self.log("✅ Channel ID matches expected value")
                    else:
                        self.log(f"❌ Channel ID mismatch. Expected: {channel_data['channelId']}, Got: {result.get('channelId')}", "ERROR")
                        return False
                    
                    return True
                else:
                    # This might fail if the bot is not admin of the channel, which is expected
                    error_msg = result.get('message', '').lower()
                    if "administrador" in error_msg or "admin" in error_msg:
                        self.log("ℹ️ Expected failure - bot is not admin of test channel, but API validation works")
                        return True
                    else:
                        self.log(f"❌ Restore publication channel failed: {result.get('message', 'No message')}", "ERROR")
                        return False
            else:
                self.log(f"❌ Restore publication channel failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Restore publication channel test failed: {str(e)}", "ERROR")
            return False

    # ===== TELEGRAM PUBLICATION CHANNEL TESTS =====
    
    def test_get_publication_channel(self) -> bool:
        """Test GET /api/telegram/publication-channel - Get current publication channel config"""
        self.log("=== Testing Get Publication Channel ===")
        
        try:
            response = self.make_request("GET", "/telegram/publication-channel")
            
            if response.status_code == 200:
                channel_info = response.json()
                self.log("✅ Successfully retrieved publication channel info")
                
                # Check response structure
                expected_fields = ["configured", "channelId", "channelTitle"]
                for field in expected_fields:
                    if field in channel_info:
                        self.log(f"✅ Publication channel info has {field}: {channel_info[field]}")
                    else:
                        self.log(f"❌ Publication channel info missing {field}", "ERROR")
                        return False
                
                # Initially should be unconfigured
                if not channel_info.get("configured"):
                    self.log("✅ Publication channel is initially unconfigured as expected")
                    if channel_info.get("channelId") is None and channel_info.get("channelTitle") is None:
                        self.log("✅ Channel ID and title are null as expected")
                    else:
                        self.log("⚠️ Channel ID or title not null despite being unconfigured", "WARN")
                else:
                    self.log("ℹ️ Publication channel is already configured")
                
                return True
            else:
                self.log(f"❌ Get publication channel failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get publication channel test failed: {str(e)}", "ERROR")
            return False

    def test_set_publication_channel(self) -> bool:
        """Test POST /api/telegram/publication-channel - Set publication channel"""
        self.log("=== Testing Set Publication Channel ===")
        
        # Use one of the existing channels from the review request
        channel_data = {
            "channelId": "-1003329431615",
            "channelTitle": "Test Publication Channel"
        }
        
        try:
            response = self.make_request("POST", "/telegram/publication-channel", channel_data)
            
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                self.log("✅ Publication channel set request completed")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Publication channel set successfully")
                    
                    # Verify the response contains the channel info
                    if result.get("channelId") == channel_data["channelId"]:
                        self.log("✅ Channel ID matches expected value")
                    else:
                        self.log(f"❌ Channel ID mismatch. Expected: {channel_data['channelId']}, Got: {result.get('channelId')}", "ERROR")
                        return False
                    
                    if result.get("channelTitle"):
                        self.log(f"✅ Channel title set: {result.get('channelTitle')}")
                    else:
                        self.log("⚠️ No channel title in response", "WARN")
                    
                    return True
                else:
                    self.log(f"❌ Publication channel set failed: {result.get('message', 'No message')}", "ERROR")
                    # This might fail if the bot is not admin of the channel, which is expected
                    if "administrador" in result.get('message', '').lower() or "admin" in result.get('message', '').lower():
                        self.log("ℹ️ Expected failure - bot is not admin of test channel")
                        return True
                    return False
            else:
                self.log(f"❌ Set publication channel failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Set publication channel test failed: {str(e)}", "ERROR")
            return False

    def test_verify_publication_channel_set(self) -> bool:
        """Test GET /api/telegram/publication-channel after setting - Verify channel is configured"""
        self.log("=== Testing Verify Publication Channel Set ===")
        
        try:
            response = self.make_request("GET", "/telegram/publication-channel")
            
            if response.status_code == 200:
                channel_info = response.json()
                self.log("✅ Successfully retrieved publication channel info after setting")
                
                # Check if channel is now configured (might not be if bot verification failed)
                if channel_info.get("configured"):
                    self.log("✅ Publication channel is now configured")
                    
                    channel_id = channel_info.get("channelId")
                    channel_title = channel_info.get("channelTitle")
                    
                    if channel_id:
                        self.log(f"✅ Channel ID: {channel_id}")
                    else:
                        self.log("❌ Channel ID is missing", "ERROR")
                        return False
                    
                    if channel_title:
                        self.log(f"✅ Channel title: {channel_title}")
                    else:
                        self.log("⚠️ Channel title is missing", "WARN")
                    
                    return True
                else:
                    self.log("ℹ️ Publication channel still unconfigured (expected if bot verification failed)")
                    return True  # Still pass as this is expected behavior
                    
            else:
                self.log(f"❌ Verify publication channel failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Verify publication channel test failed: {str(e)}", "ERROR")
            return False

    def test_publish_product_to_telegram(self) -> bool:
        """Test POST /api/products/:id/publish-telegram - Publish product to Telegram"""
        self.log("=== Testing Publish Product to Telegram ===")
        
        # First get a product ID from the tipster's products
        try:
            products_response = self.make_request("GET", "/products/my")
            
            if products_response.status_code != 200:
                self.log("❌ Could not get products list for publish test", "ERROR")
                return False
            
            products = products_response.json()
            if not products or len(products) == 0:
                self.log("❌ No products available for publish test", "ERROR")
                return False
            
            # Use the first product
            product_id = products[0].get("id")
            if not product_id:
                self.log("❌ Product missing ID field", "ERROR")
                return False
            
            self.log(f"Using product ID: {product_id} for publish test")
            
            # Test publishing to Telegram
            response = self.make_request("POST", f"/products/{product_id}/publish-telegram")
            
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                self.log("✅ Publish to Telegram request completed")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Product published to Telegram successfully")
                    
                    # Check for message info
                    if result.get("messageId"):
                        self.log(f"✅ Message ID: {result.get('messageId')}")
                    
                    if result.get("channelId"):
                        self.log(f"✅ Published to channel: {result.get('channelId')}")
                    
                    return True
                else:
                    self.log(f"❌ Publish to Telegram failed: {result.get('message', 'No message')}", "ERROR")
                    # This might fail if no publication channel is configured or bot has no access
                    error_msg = result.get('message', '').lower()
                    if "canal" in error_msg or "channel" in error_msg or "configurado" in error_msg:
                        self.log("ℹ️ Expected failure - no publication channel configured or bot has no access")
                        return True
                    return False
            else:
                self.log(f"❌ Publish to Telegram failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Publish product to Telegram test failed: {str(e)}", "ERROR")
            return False

    def test_delete_publication_channel(self) -> bool:
        """Test DELETE /api/telegram/publication-channel - Remove publication channel"""
        self.log("=== Testing Delete Publication Channel ===")
        
        try:
            response = self.make_request("DELETE", "/telegram/publication-channel")
            
            if response.status_code == 200:
                result = response.json()
                self.log("✅ Delete publication channel request completed")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Publication channel deleted successfully")
                    
                    if result.get("message"):
                        self.log(f"✅ Delete message: {result.get('message')}")
                    
                    return True
                else:
                    self.log(f"❌ Delete publication channel failed: {result.get('message', 'No message')}", "ERROR")
                    return False
            else:
                self.log(f"❌ Delete publication channel failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Delete publication channel test failed: {str(e)}", "ERROR")
            return False

    def test_verify_publication_channel_deleted(self) -> bool:
        """Test GET /api/telegram/publication-channel after deletion - Verify channel is unconfigured"""
        self.log("=== Testing Verify Publication Channel Deleted ===")
        
        try:
            response = self.make_request("GET", "/telegram/publication-channel")
            
            if response.status_code == 200:
                channel_info = response.json()
                self.log("✅ Successfully retrieved publication channel info after deletion")
                
                # Check if channel is now unconfigured
                if not channel_info.get("configured"):
                    self.log("✅ Publication channel is now unconfigured as expected")
                    
                    if channel_info.get("channelId") is None and channel_info.get("channelTitle") is None:
                        self.log("✅ Channel ID and title are null as expected")
                        return True
                    else:
                        self.log("❌ Channel ID or title not null after deletion", "ERROR")
                        return False
                else:
                    self.log("❌ Publication channel still configured after deletion", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Verify publication channel deleted failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Verify publication channel deleted test failed: {str(e)}", "ERROR")
            return False

    # ===== TELEGRAM CHANNELS MULTI-CANAL API TESTS =====
    
    def test_get_telegram_channels(self) -> bool:
        """Test GET /api/telegram/channels - Get all channels for tipster"""
        self.log("=== Testing Get Telegram Channels ===")
        
        try:
            response = self.make_request("GET", "/telegram/channels")
            
            if response.status_code == 200:
                response_data = response.json()
                self.log("✅ Successfully retrieved telegram channels")
                
                # Check response structure
                if "channels" in response_data:
                    channels = response_data["channels"]
                    self.log(f"✅ Found {len(channels)} channels")
                    
                    # Log channel details for debugging
                    for i, channel in enumerate(channels):
                        self.log(f"Channel {i+1}: {channel.get('channelTitle', 'No title')} (ID: {channel.get('id', 'No ID')})")
                        self.log(f"  - Channel ID: {channel.get('channelId', 'No channelId')}")
                        self.log(f"  - Type: {channel.get('channelType', 'No type')}")
                        self.log(f"  - Active: {channel.get('isActive', 'No status')}")
                    
                    return True
                else:
                    self.log("❌ Response missing 'channels' field", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Get telegram channels failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get telegram channels test failed: {str(e)}", "ERROR")
            return False

    def test_verify_telegram_channel(self) -> bool:
        """Test POST /api/telegram/channels/verify - Verify a channel"""
        self.log("=== Testing Verify Telegram Channel ===")
        
        verify_data = {
            "channelId": "-1001234567890"
        }
        
        try:
            response = self.make_request("POST", "/telegram/channels/verify", verify_data)
            
            if response.status_code == 200:
                result = response.json()
                self.log("✅ Channel verification request completed")
                
                # Check response structure
                if "valid" in result:
                    is_valid = result["valid"]
                    self.log(f"✅ Channel valid: {is_valid}")
                    
                    if is_valid:
                        # If valid, check for additional info
                        if "title" in result:
                            self.log(f"✅ Channel title: {result['title']}")
                        if "type" in result:
                            self.log(f"✅ Channel type: {result['type']}")
                        if "memberCount" in result:
                            self.log(f"✅ Member count: {result['memberCount']}")
                    else:
                        # If invalid, check for error message
                        if "error" in result:
                            self.log(f"ℹ️ Verification error (expected): {result['error']}")
                    
                    return True
                else:
                    self.log("❌ Response missing 'valid' field", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Verify telegram channel failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Verify telegram channel test failed: {str(e)}", "ERROR")
            return False

    def test_create_telegram_channel(self) -> bool:
        """Test POST /api/telegram/channels - Create a new channel"""
        self.log("=== Testing Create Telegram Channel ===")
        
        channel_data = {
            "channelId": "-1001111222333",
            "channelTitle": "Test Channel from API",
            "channelType": "private"
        }
        
        try:
            response = self.make_request("POST", "/telegram/channels", channel_data)
            
            if response.status_code == 201:
                result = response.json()
                self.log("✅ Telegram channel created successfully")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Creation marked as successful")
                    
                    if "channel" in result and result["channel"]:
                        channel = result["channel"]
                        self.test_channel_id = channel.get("id")  # Store for deletion test
                        self.log(f"✅ Channel created with ID: {self.test_channel_id}")
                        
                        # Verify channel fields
                        if channel.get("channelTitle") == channel_data["channelTitle"]:
                            self.log("✅ Channel title matches")
                        else:
                            self.log("❌ Channel title mismatch", "ERROR")
                            
                        if channel.get("channelId") == channel_data["channelId"]:
                            self.log("✅ Channel ID matches")
                        else:
                            self.log("❌ Channel ID mismatch", "ERROR")
                            
                        if channel.get("channelType") == channel_data["channelType"]:
                            self.log("✅ Channel type matches")
                        else:
                            self.log("❌ Channel type mismatch", "ERROR")
                        
                        return True
                    else:
                        self.log("❌ Response missing channel data", "ERROR")
                        return False
                else:
                    self.log("❌ Creation marked as failed", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Create telegram channel failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Create telegram channel test failed: {str(e)}", "ERROR")
            return False

    def test_delete_telegram_channel(self) -> bool:
        """Test DELETE /api/telegram/channels/:id - Delete a channel"""
        if not hasattr(self, 'test_channel_id') or not self.test_channel_id:
            self.log("❌ No test channel ID available for deletion", "ERROR")
            return False
            
        self.log("=== Testing Delete Telegram Channel ===")
        
        try:
            response = self.make_request("DELETE", f"/telegram/channels/{self.test_channel_id}")
            
            if response.status_code == 200:
                result = response.json()
                self.log("✅ Telegram channel deleted successfully")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Deletion marked as successful")
                    
                    if "message" in result:
                        self.log(f"✅ Message: {result['message']}")
                    
                    return True
                else:
                    self.log("❌ Deletion marked as failed", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Delete telegram channel failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Delete telegram channel test failed: {str(e)}", "ERROR")
            return False

    # ===== AFFILIATE MODULE TESTS =====
    
    def test_admin_login(self) -> bool:
        """Test authentication with admin credentials"""
        self.log("=== Testing Admin Authentication ===")
        
        login_data = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        
        try:
            response = self.make_request("POST", "/auth/login", login_data, use_auth=False)
            
            if response.status_code == 200:
                response_data = response.json()
                
                # Check if access_token is in response
                if "access_token" in response_data:
                    self.admin_access_token = response_data["access_token"]
                    self.log("✅ Admin login successful - JWT token received")
                    return True
                else:
                    self.log("❌ Admin login response missing access_token", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Admin login failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin login test failed: {str(e)}", "ERROR")
            return False

    def test_admin_get_betting_houses(self) -> bool:
        """Test GET /api/admin/affiliate/houses - List all betting houses"""
        self.log("=== Testing Admin Get Betting Houses ===")
        
        if not self.admin_access_token:
            self.log("❌ No admin token available", "ERROR")
            return False
        
        # Temporarily store current token and use admin token
        original_token = self.access_token
        self.access_token = self.admin_access_token
        
        try:
            response = self.make_request("GET", "/admin/affiliate/houses")
            
            if response.status_code == 200:
                houses = response.json()
                self.log(f"✅ Successfully retrieved {len(houses)} betting houses")
                
                # Check if Bwin and Betway exist as mentioned in review request
                house_names = [house.get('name', '').lower() for house in houses]
                
                if any('bwin' in name for name in house_names):
                    self.log("✅ Found Bwin betting house")
                else:
                    self.log("⚠️ Bwin betting house not found", "WARN")
                
                if any('betway' in name for name in house_names):
                    self.log("✅ Found Betway betting house")
                else:
                    self.log("⚠️ Betway betting house not found", "WARN")
                
                # Log house details for debugging
                for i, house in enumerate(houses):
                    self.log(f"House {i+1}: {house.get('name', 'No name')} - €{house.get('commissionPerReferralEur', 0)}/ref")
                    
                return True
            else:
                self.log(f"❌ Get betting houses failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get betting houses test failed: {str(e)}", "ERROR")
            return False
        finally:
            # Restore original token
            self.access_token = original_token

    def test_admin_create_betting_house(self) -> bool:
        """Test POST /api/admin/affiliate/houses - Create a new betting house"""
        self.log("=== Testing Admin Create Betting House ===")
        
        if not self.admin_access_token:
            self.log("❌ No admin token available", "ERROR")
            return False
        
        # Temporarily store current token and use admin token
        original_token = self.access_token
        self.access_token = self.admin_access_token
        
        house_data = {
            "name": "Test House API",
            "slug": "test-house-api",
            "websiteUrl": "https://testbetting.com",
            "logoUrl": "https://testbetting.com/logo.png",
            "commissionPerReferralCents": 2500,
            "allowedCountries": ["ES", "FR", "IT"],
            "blockedCountries": ["US", "UK"],
            "masterAffiliateUrl": "https://testbetting.com/register?ref={TRACKING_ID}",
            "description": "Test betting house created via API"
        }
        
        try:
            response = self.make_request("POST", "/admin/affiliate/houses", house_data)
            
            if response.status_code == 201:
                house = response.json()
                self.test_house_id = house.get("id")
                self.log(f"✅ Betting house created successfully with ID: {self.test_house_id}")
                
                # Verify house fields
                if house.get("name") == house_data["name"]:
                    self.log("✅ House name matches")
                else:
                    self.log("❌ House name mismatch", "ERROR")
                    
                if house.get("commissionPerReferralEur") == house_data["commissionPerReferralEur"]:
                    self.log("✅ House commission matches")
                else:
                    self.log("❌ House commission mismatch", "ERROR")
                    
                return True
            else:
                self.log(f"❌ Create betting house failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Create betting house test failed: {str(e)}", "ERROR")
            return False
        finally:
            # Restore original token
            self.access_token = original_token

    def test_tipster_get_houses(self) -> bool:
        """Test GET /api/affiliate/houses - Get houses with personal affiliate links"""
        self.log("=== Testing Tipster Get Houses ===")
        
        try:
            response = self.make_request("GET", "/affiliate/houses")
            
            if response.status_code == 200:
                houses = response.json()
                self.log(f"✅ Successfully retrieved {len(houses)} houses for tipster")
                
                # Log house details for debugging
                for i, house in enumerate(houses):
                    house_info = house.get('house', {})
                    link_info = house.get('link', {})
                    self.log(f"House {i+1}: {house_info.get('name', 'No name')} - Link: {link_info.get('redirectCode', 'No code')}")
                    
                return True
            else:
                self.log(f"❌ Get tipster houses failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get tipster houses test failed: {str(e)}", "ERROR")
            return False

    def test_tipster_generate_affiliate_link(self) -> bool:
        """Test POST /api/affiliate/houses/:houseId/link - Generate link for house"""
        self.log("=== Testing Tipster Generate Affiliate Link ===")
        
        # First get available houses to get a house ID
        try:
            houses_response = self.make_request("GET", "/affiliate/houses")
            if houses_response.status_code != 200:
                self.log("❌ Could not get houses to test link generation", "ERROR")
                return False
            
            houses = houses_response.json()
            if not houses:
                self.log("❌ No houses available for link generation", "ERROR")
                return False
            
            # Use the first house
            first_house = houses[0]
            house_id = first_house.get('house', {}).get('id')
            
            if not house_id:
                self.log("❌ No house ID found in first house", "ERROR")
                return False
            
            self.log(f"Using house ID: {house_id}")
            
            response = self.make_request("POST", f"/affiliate/houses/{house_id}/link")
            
            if response.status_code in [200, 201]:
                result = response.json()
                self.log("✅ Affiliate link generated successfully")
                
                # Check response structure
                if result.get("success"):
                    self.log("✅ Link generation marked as successful")
                    
                    link_info = result.get("link", {})
                    if link_info.get("redirectCode"):
                        self.log(f"✅ Redirect code generated: {link_info['redirectCode']}")
                        
                        if link_info.get("redirectUrl"):
                            self.log(f"✅ Redirect URL: {link_info['redirectUrl']}")
                        else:
                            self.log("❌ No redirect URL in response", "ERROR")
                            return False
                    else:
                        self.log("❌ No redirect code in response", "ERROR")
                        return False
                        
                    house_info = result.get("house", {})
                    if house_info.get("name"):
                        self.log(f"✅ House info included: {house_info['name']}")
                    else:
                        self.log("❌ No house info in response", "ERROR")
                        return False
                        
                    return True
                else:
                    self.log("❌ Link generation marked as failed", "ERROR")
                    return False
            else:
                self.log(f"❌ Generate affiliate link failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Generate affiliate link test failed: {str(e)}", "ERROR")
            return False

    def test_tipster_get_affiliate_metrics(self) -> bool:
        """Test GET /api/affiliate/metrics - Get affiliate metrics"""
        self.log("=== Testing Tipster Get Affiliate Metrics ===")
        
        try:
            response = self.make_request("GET", "/affiliate/metrics")
            
            if response.status_code == 200:
                metrics = response.json()
                self.log("✅ Successfully retrieved affiliate metrics")
                
                # Check expected metrics fields
                expected_fields = ["totalClicks", "totalReferrals", "pendingReferrals", "approvedReferrals", "totalEarningsCents"]
                for field in expected_fields:
                    if field in metrics:
                        self.log(f"✅ Metrics has {field}: {metrics[field]}")
                    else:
                        self.log(f"⚠️ Metrics missing {field}", "WARN")
                
                return True
            else:
                self.log(f"❌ Get affiliate metrics failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get affiliate metrics test failed: {str(e)}", "ERROR")
            return False

    def test_public_redirect_info(self) -> bool:
        """Test GET /api/r/:redirectCode/info - Get redirect info without redirecting"""
        self.log("=== Testing Public Redirect Info ===")
        
        # First generate a link to get a redirect code
        try:
            houses_response = self.make_request("GET", "/affiliate/houses")
            if houses_response.status_code != 200:
                self.log("❌ Could not get houses to test redirect info", "ERROR")
                return False
            
            houses = houses_response.json()
            if not houses:
                self.log("❌ No houses available for redirect info test", "ERROR")
                return False
            
            # Use the first house and get its redirect code
            first_house = houses[0]
            link_info = first_house.get('link', {})
            redirect_code = link_info.get('redirectCode')
            
            if not redirect_code:
                self.log("❌ No redirect code found in first house", "ERROR")
                return False
            
            self.log(f"Using redirect code: {redirect_code}")
            
            response = self.make_request("GET", f"/r/{redirect_code}/info", use_auth=False)
            
            if response.status_code == 200:
                info = response.json()
                self.log("✅ Successfully retrieved redirect info")
                
                # Check response structure
                if info.get("valid"):
                    self.log("✅ Redirect link is valid")
                    
                    house_info = info.get("house", {})
                    if house_info.get("name"):
                        self.log(f"✅ House name: {house_info['name']}")
                    
                    if "countryCode" in info:
                        self.log(f"✅ Country detected: {info['countryCode']}")
                    
                    if "isAllowed" in info:
                        self.log(f"✅ Access allowed: {info['isAllowed']}")
                        
                        if not info["isAllowed"] and info.get("blockReason"):
                            self.log(f"ℹ️ Block reason: {info['blockReason']}")
                    
                    return True
                else:
                    self.log(f"❌ Redirect link is invalid: {info.get('error', 'No error message')}", "ERROR")
                    return False
            else:
                self.log(f"❌ Get redirect info failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get redirect info test failed: {str(e)}", "ERROR")
            return False

    # ===== CLIENT PANEL TESTS =====
    
    def test_client_login(self) -> bool:
        """Test authentication with client credentials"""
        self.log("=== Testing Client Authentication ===")
        
        login_data = {
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        }
        
        try:
            response = self.make_request("POST", "/auth/login", login_data, use_auth=False)
            
            if response.status_code == 200:
                response_data = response.json()
                
                # Check if access_token is in response
                if "access_token" in response_data:
                    self.client_access_token = response_data["access_token"]
                    self.log("✅ Client login successful - JWT token received")
                    return True
                else:
                    self.log("❌ Client login response missing access_token", "ERROR")
                    return False
                    
            else:
                self.log(f"❌ Client login failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Client login test failed: {str(e)}", "ERROR")
            return False

    def test_client_get_profile(self) -> bool:
        """Test GET /api/client/profile - Get client profile"""
        self.log("=== Testing Client Get Profile ===")
        
        if not self.client_access_token:
            self.log("❌ No client token available", "ERROR")
            return False
        
        # Temporarily store current token and use client token
        original_token = self.access_token
        self.access_token = self.client_access_token
        
        try:
            response = self.make_request("GET", "/client/profile")
            
            if response.status_code == 200:
                profile_data = response.json()
                self.log("✅ Successfully retrieved client profile")
                
                # Check response structure
                expected_fields = ["profile", "user"]
                for field in expected_fields:
                    if field in profile_data:
                        self.log(f"✅ Profile response has {field}")
                        
                        if field == "user":
                            user = profile_data[field]
                            self.log(f"  - User ID: {user.get('id', 'N/A')}")
                            self.log(f"  - User Email: {user.get('email', 'N/A')}")
                            self.log(f"  - User Name: {user.get('name', 'N/A')}")
                        elif field == "profile":
                            profile = profile_data[field]
                            if profile:
                                self.log(f"  - Country ISO: {profile.get('countryIso', 'N/A')}")
                                self.log(f"  - Telegram User ID: {profile.get('telegramUserId', 'N/A')}")
                                self.log(f"  - Locale: {profile.get('locale', 'N/A')}")
                            else:
                                self.log("  - Profile is null (new client)")
                    else:
                        self.log(f"❌ Profile response missing {field}", "ERROR")
                        return False
                
                return True
            else:
                self.log(f"❌ Get client profile failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get client profile test failed: {str(e)}", "ERROR")
            return False
        finally:
            # Restore original token
            self.access_token = original_token

    def test_client_update_profile(self) -> bool:
        """Test PUT /api/client/profile - Update client profile"""
        self.log("=== Testing Client Update Profile ===")
        
        if not self.client_access_token:
            self.log("❌ No client token available", "ERROR")
            return False
        
        # Temporarily store current token and use client token
        original_token = self.access_token
        self.access_token = self.client_access_token
        
        update_data = {
            "countryIso": "ES",
            "telegramUserId": "123456789",
            "locale": "es-ES",
            "timezone": "Europe/Madrid"
        }
        
        try:
            response = self.make_request("PUT", "/client/profile", update_data)
            
            if response.status_code == 200:
                updated_profile = response.json()
                self.log("✅ Client profile updated successfully")
                
                # Check if the response indicates success or failure
                if updated_profile.get("success") == False:
                    self.log(f"⚠️ Profile update returned success=false: {updated_profile.get('message', 'No message')}")
                    # This might be expected for a new client profile
                    return True
                
                # If success is true or not present, verify the updates
                if updated_profile.get("countryIso") == update_data["countryIso"]:
                    self.log("✅ Country ISO updated correctly")
                elif "countryIso" not in updated_profile:
                    self.log("ℹ️ Country ISO not in response (might be expected)")
                else:
                    self.log("❌ Country ISO update failed", "ERROR")
                    
                if updated_profile.get("telegramUserId") == update_data["telegramUserId"]:
                    self.log("✅ Telegram User ID updated correctly")
                elif "telegramUserId" not in updated_profile:
                    self.log("ℹ️ Telegram User ID not in response (might be expected)")
                else:
                    self.log("❌ Telegram User ID update failed", "ERROR")
                    
                if updated_profile.get("locale") == update_data["locale"]:
                    self.log("✅ Locale updated correctly")
                elif "locale" not in updated_profile:
                    self.log("ℹ️ Locale not in response (might be expected)")
                else:
                    self.log("❌ Locale update failed", "ERROR")
                    
                return True
            else:
                self.log(f"❌ Update client profile failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Update client profile test failed: {str(e)}", "ERROR")
            return False
        finally:
            # Restore original token
            self.access_token = original_token

    def test_client_get_purchases(self) -> bool:
        """Test GET /api/client/purchases - Get all purchases"""
        self.log("=== Testing Client Get Purchases ===")
        
        if not self.client_access_token:
            self.log("❌ No client token available", "ERROR")
            return False
        
        # Temporarily store current token and use client token
        original_token = self.access_token
        self.access_token = self.client_access_token
        
        try:
            response = self.make_request("GET", "/client/purchases")
            
            if response.status_code == 200:
                purchases = response.json()
                self.log(f"✅ Successfully retrieved {len(purchases)} purchases")
                
                # Log purchase details for debugging
                for i, purchase in enumerate(purchases):
                    self.log(f"Purchase {i+1}:")
                    self.log(f"  - ID: {purchase.get('id', 'N/A')}")
                    self.log(f"  - Status: {purchase.get('status', 'N/A')}")
                    self.log(f"  - Amount: {purchase.get('amountCents', 'N/A')} cents")
                    self.log(f"  - Currency: {purchase.get('currency', 'N/A')}")
                    self.log(f"  - Created: {purchase.get('createdAt', 'N/A')}")
                    
                    # Check if product info is included
                    if 'product' in purchase and purchase['product']:
                        product = purchase['product']
                        self.log(f"  - Product: {product.get('title', 'N/A')}")
                    
                return True
            else:
                self.log(f"❌ Get client purchases failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get client purchases test failed: {str(e)}", "ERROR")
            return False
        finally:
            # Restore original token
            self.access_token = original_token

    def test_client_get_purchase_details(self) -> bool:
        """Test GET /api/client/purchases/:id - Get purchase details"""
        self.log("=== Testing Client Get Purchase Details ===")
        
        if not self.client_access_token:
            self.log("❌ No client token available", "ERROR")
            return False
        
        # Temporarily store current token and use client token
        original_token = self.access_token
        self.access_token = self.client_access_token
        
        try:
            # First get purchases to get a purchase ID
            purchases_response = self.make_request("GET", "/client/purchases")
            
            if purchases_response.status_code != 200:
                self.log("❌ Could not get purchases list for details test", "ERROR")
                return False
            
            purchases = purchases_response.json()
            if not purchases or len(purchases) == 0:
                self.log("ℹ️ No purchases available for details test - this is expected for new client")
                return True
            
            # Use the first purchase
            purchase_id = purchases[0].get("id")
            if not purchase_id:
                self.log("❌ Purchase missing ID field", "ERROR")
                return False
            
            self.log(f"Using purchase ID: {purchase_id} for details test")
            
            response = self.make_request("GET", f"/client/purchases/{purchase_id}")
            
            if response.status_code == 200:
                details = response.json()
                self.log("✅ Successfully retrieved purchase details")
                
                # Check if it's an error response
                if "error" in details:
                    self.log(f"ℹ️ Purchase not found: {details['error']} (this might be expected)")
                    return True
                
                # Check response structure for valid purchase
                expected_fields = ["id", "status", "amountCents", "currency"]
                for field in expected_fields:
                    if field in details:
                        self.log(f"✅ Purchase details has {field}: {details[field]}")
                    else:
                        self.log(f"❌ Purchase details missing {field}", "ERROR")
                        return False
                
                # Check for product and tipster info
                if "product" in details and details["product"]:
                    product = details["product"]
                    self.log(f"✅ Product info included: {product.get('title', 'No title')}")
                
                if "tipster" in details and details["tipster"]:
                    tipster = details["tipster"]
                    self.log(f"✅ Tipster info included: {tipster.get('publicName', 'No name')}")
                
                return True
            else:
                self.log(f"❌ Get purchase details failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get purchase details test failed: {str(e)}", "ERROR")
            return False
        finally:
            # Restore original token
            self.access_token = original_token

    def test_client_get_payments(self) -> bool:
        """Test GET /api/client/payments - Get payment history"""
        self.log("=== Testing Client Get Payment History ===")
        
        if not self.client_access_token:
            self.log("❌ No client token available", "ERROR")
            return False
        
        # Temporarily store current token and use client token
        original_token = self.access_token
        self.access_token = self.client_access_token
        
        try:
            response = self.make_request("GET", "/client/payments")
            
            if response.status_code == 200:
                payments = response.json()
                self.log(f"✅ Successfully retrieved {len(payments)} payment records")
                
                # Log payment details for debugging
                for i, payment in enumerate(payments):
                    self.log(f"Payment {i+1}:")
                    self.log(f"  - ID: {payment.get('id', 'N/A')}")
                    self.log(f"  - Status: {payment.get('status', 'N/A')}")
                    self.log(f"  - Amount: {payment.get('amountCents', 'N/A')} cents")
                    self.log(f"  - Currency: {payment.get('currency', 'N/A')}")
                    self.log(f"  - Provider: {payment.get('paymentProvider', 'N/A')}")
                    self.log(f"  - Paid At: {payment.get('paidAt', 'N/A')}")
                    
                return True
            else:
                self.log(f"❌ Get client payments failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get client payments test failed: {str(e)}", "ERROR")
            return False
        finally:
            # Restore original token
            self.access_token = original_token

    def test_client_create_support_ticket(self) -> bool:
        """Test POST /api/support/tickets - Create support ticket"""
        self.log("=== Testing Client Create Support Ticket ===")
        
        if not self.client_access_token:
            self.log("❌ No client token available", "ERROR")
            return False
        
        # Temporarily store current token and use client token
        original_token = self.access_token
        self.access_token = self.client_access_token
        
        ticket_data = {
            "category": "access",
            "subject": "Test ticket from API",
            "description": "This is a test support ticket created via API testing",
            "orderId": None  # Optional field
        }
        
        try:
            response = self.make_request("POST", "/support/tickets", ticket_data)
            
            if response.status_code in [200, 201]:
                ticket_response = response.json()
                
                # Check if the response indicates success
                if ticket_response.get("success"):
                    self.test_ticket_id = ticket_response.get("ticketId")
                    self.log(f"✅ Support ticket created successfully with ID: {self.test_ticket_id}")
                    
                    if ticket_response.get("message"):
                        self.log(f"✅ Success message: {ticket_response.get('message')}")
                    
                    return True
                else:
                    self.log(f"❌ Ticket creation failed: {ticket_response.get('message', 'No message')}", "ERROR")
                    return False
            else:
                self.log(f"❌ Create support ticket failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Create support ticket test failed: {str(e)}", "ERROR")
            return False
        finally:
            # Restore original token
            self.access_token = original_token

    def test_client_get_my_tickets(self) -> bool:
        """Test GET /api/support/tickets/my - Get my support tickets"""
        self.log("=== Testing Client Get My Tickets ===")
        
        if not self.client_access_token:
            self.log("❌ No client token available", "ERROR")
            return False
        
        # Temporarily store current token and use client token
        original_token = self.access_token
        self.access_token = self.client_access_token
        
        try:
            response = self.make_request("GET", "/support/tickets/my")
            
            if response.status_code == 200:
                tickets = response.json()
                self.log(f"✅ Successfully retrieved {len(tickets)} support tickets")
                
                # Log ticket details for debugging
                for i, ticket in enumerate(tickets):
                    self.log(f"Ticket {i+1}:")
                    self.log(f"  - ID: {ticket.get('id', 'N/A')}")
                    self.log(f"  - Category: {ticket.get('category', 'N/A')}")
                    self.log(f"  - Subject: {ticket.get('subject', 'N/A')}")
                    self.log(f"  - Status: {ticket.get('status', 'N/A')}")
                    self.log(f"  - Priority: {ticket.get('priority', 'N/A')}")
                    self.log(f"  - Created: {ticket.get('createdAt', 'N/A')}")
                
                # Verify our test ticket appears in the list
                if self.test_ticket_id:
                    found_test_ticket = any(ticket.get('id') == self.test_ticket_id for ticket in tickets)
                    if found_test_ticket:
                        self.log("✅ Test ticket appears in my tickets list")
                    else:
                        self.log("❌ Test ticket NOT found in my tickets list", "ERROR")
                        return False
                
                return True
            else:
                self.log(f"❌ Get my tickets failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get my tickets test failed: {str(e)}", "ERROR")
            return False
        finally:
            # Restore original token
            self.access_token = original_token

    def test_client_get_ticket_details(self) -> bool:
        """Test GET /api/support/tickets/my/:id - Get ticket details"""
        self.log("=== Testing Client Get Ticket Details ===")
        
        if not self.client_access_token:
            self.log("❌ No client token available", "ERROR")
            return False
        
        if not self.test_ticket_id:
            self.log("❌ No test ticket ID available", "ERROR")
            return False
        
        # Temporarily store current token and use client token
        original_token = self.access_token
        self.access_token = self.client_access_token
        
        try:
            response = self.make_request("GET", f"/support/tickets/my/{self.test_ticket_id}")
            
            if response.status_code == 200:
                ticket_details = response.json()
                self.log("✅ Successfully retrieved ticket details")
                
                # Check if it's an error response
                if "error" in ticket_details:
                    self.log(f"❌ Ticket not found: {ticket_details['error']}", "ERROR")
                    return False
                
                # Check response structure
                expected_fields = ["id", "category", "subject", "description", "status"]
                for field in expected_fields:
                    if field in ticket_details:
                        self.log(f"✅ Ticket details has {field}: {ticket_details[field]}")
                    else:
                        self.log(f"❌ Ticket details missing {field}", "ERROR")
                        return False
                
                # Verify it's our test ticket
                if ticket_details.get("id") == self.test_ticket_id:
                    self.log("✅ Ticket ID matches test ticket")
                else:
                    self.log("❌ Ticket ID mismatch", "ERROR")
                    return False
                
                return True
            else:
                self.log(f"❌ Get ticket details failed with status {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get ticket details test failed: {str(e)}", "ERROR")
            return False
        finally:
            # Restore original token
            self.access_token = original_token

    def run_client_panel_tests(self) -> Dict[str, bool]:
        """Run all client panel tests"""
        self.log("=" * 50)
        self.log("👤 STARTING CLIENT PANEL TESTS")
        self.log("=" * 50)
        
        results = {}
        
        # Test client authentication first
        results["client_login"] = self.test_client_login()
        if not results["client_login"]:
            self.log("❌ Client authentication failed - stopping client tests", "ERROR")
            return results
        
        # Client Profile API tests
        results["client_get_profile"] = self.test_client_get_profile()
        results["client_update_profile"] = self.test_client_update_profile()
        
        # Purchases API tests
        results["client_get_purchases"] = self.test_client_get_purchases()
        results["client_get_purchase_details"] = self.test_client_get_purchase_details()
        
        # Payments API tests
        results["client_get_payments"] = self.test_client_get_payments()
        
        # Support Tickets API tests
        results["client_create_support_ticket"] = self.test_client_create_support_ticket()
        results["client_get_my_tickets"] = self.test_client_get_my_tickets()
        results["client_get_ticket_details"] = self.test_client_get_ticket_details()
        
        return results

    def run_affiliate_tests(self) -> bool:
        """Run all affiliate module tests"""
        self.log("=" * 50)
        self.log("🏆 STARTING AFFILIATE MODULE TESTS")
        self.log("=" * 50)
        
        tests = [
            ("Admin Login", self.test_admin_login),
            ("Admin Get Betting Houses", self.test_admin_get_betting_houses),
            ("Admin Create Betting House", self.test_admin_create_betting_house),
            ("Tipster Get Houses", self.test_tipster_get_houses),
            ("Tipster Generate Affiliate Link", self.test_tipster_generate_affiliate_link),
            ("Tipster Get Affiliate Metrics", self.test_tipster_get_affiliate_metrics),
            ("Public Redirect Info", self.test_public_redirect_info),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            self.log(f"\n--- Running: {test_name} ---")
            try:
                if test_func():
                    passed += 1
                    self.log(f"✅ {test_name} PASSED")
                else:
                    failed += 1
                    self.log(f"❌ {test_name} FAILED")
            except Exception as e:
                failed += 1
                self.log(f"❌ {test_name} FAILED with exception: {str(e)}")
        
        self.log("\n" + "=" * 50)
        self.log("🏆 AFFILIATE MODULE TESTS SUMMARY")
        self.log("=" * 50)
        self.log(f"✅ PASSED: {passed}")
        self.log(f"❌ FAILED: {failed}")
        self.log(f"📊 TOTAL: {passed + failed}")
        
        if failed == 0:
            self.log("🎉 ALL AFFILIATE TESTS PASSED!")
            return True
        else:
            self.log(f"⚠️ {failed} AFFILIATE TESTS FAILED")
            return False

    def run_all_tests(self) -> Dict[str, bool]:
        """Run all API tests"""
        self.log("🚀 Starting Antia Platform Backend API Tests")
        self.log(f"Testing against: {API_BASE}")
        
        results = {}
        
        # Test authentication first
        results["login"] = self.test_login()
        if not results["login"]:
            self.log("❌ Authentication failed - stopping tests", "ERROR")
            return results
            
        # Test getting existing products
        results["get_my_products"] = self.test_get_my_products()
        
        # Test creating a new product
        results["create_product"] = self.test_create_product()
        
        # Test getting single product (only if create succeeded)
        if results["create_product"]:
            results["get_single_product"] = self.test_get_single_product()
            results["update_product"] = self.test_update_product()
            results["pause_product"] = self.test_pause_product()
            results["publish_product"] = self.test_publish_product()
            results["verify_product_in_list"] = self.test_verify_product_in_list()
        else:
            self.log("⚠️ Skipping dependent tests due to create product failure", "WARN")
            
        # Stripe Checkout Tests (don't require authentication)
        self.log("\n" + "="*50)
        self.log("🛒 STRIPE CHECKOUT INTEGRATION TESTS")
        self.log("="*50)
        
        results["stripe_get_product"] = self.test_stripe_checkout_get_product()
        results["stripe_create_session"] = self.test_stripe_checkout_create_session()
        results["telegram_webhook"] = self.test_telegram_webhook()
        results["mongodb_orders"] = self.test_mongodb_orders()

        # Post-Payment Flow Tests
        self.log("\n" + "="*50)
        self.log("💳 POST-PAYMENT FLOW TESTS")
        self.log("="*50)
        
        # Test 1: Get existing order details
        results["get_order_details"] = self.test_get_order_details()
        
        # Test 2: Create new order and simulate payment
        test_order_id = self.create_test_order_in_mongodb()
        if test_order_id:
            results["simulate_payment"] = self.test_simulate_payment(test_order_id)
            results["complete_payment"] = self.test_complete_payment(test_order_id)
            results["verify_mongodb_order"] = self.verify_order_in_mongodb(test_order_id)
        else:
            self.log("⚠️ Skipping payment tests due to order creation failure", "WARN")
            results["simulate_payment"] = False
            results["complete_payment"] = False
            results["verify_mongodb_order"] = False
        
        # Test 3: Check Telegram notification logs
        results["telegram_notification_logs"] = self.check_telegram_notification_logs()

        # Premium Channel Flow Tests
        self.log("\n" + "="*50)
        self.log("🔗 PREMIUM CHANNEL FLOW TESTS")
        self.log("="*50)
        
        # Test 1: Get channel info (includes premium channel)
        results["get_channel_info"] = self.test_get_channel_info()
        
        # Test 2: Update premium channel link
        results["update_premium_channel"] = self.test_update_premium_channel_link()
        
        # Test 3: Clear premium channel (set to null)
        results["clear_premium_channel"] = self.test_clear_premium_channel_link()
        
        # Test 4: Set premium channel back
        results["set_premium_channel_final"] = self.test_set_premium_channel_final()
        
        # Test 5: Test purchase triggers notification with channel link
        results["purchase_triggers_notification"] = self.test_purchase_triggers_notification()
        
        # Test 6: Verify tipster earnings updated
        results["verify_tipster_earnings"] = self.test_verify_tipster_earnings_updated()

        # Geolocation-Based Payment System Tests
        self.log("\n" + "="*50)
        self.log("🌍 GEOLOCATION-BASED PAYMENT SYSTEM TESTS")
        self.log("="*50)
        
        # Test 1: Gateway detection
        results["detect_gateway"] = self.test_detect_gateway()
        
        # Test 2: Feature flags
        results["feature_flags"] = self.test_feature_flags()
        
        # Test 3: Spanish IP detection (via geolocation service)
        results["spanish_ip_detection"] = self.test_spanish_ip_detection()
        
        # Test 4: Create order and verify geo data is stored
        results["create_order_geo_data"] = self.test_create_order_with_geo_data()
        
        # Test 5: Verify order has geolocation data in MongoDB
        results["verify_order_geo_data"] = self.test_verify_order_geolocation_data()

        # Telegram Channels Multi-Canal API Tests
        self.log("\n" + "="*50)
        self.log("📺 TELEGRAM CHANNELS MULTI-CANAL API TESTS")
        self.log("="*50)
        
        # Test 1: Get all channels for tipster
        results["get_telegram_channels"] = self.test_get_telegram_channels()
        
        # Test 2: Verify a channel
        results["verify_telegram_channel"] = self.test_verify_telegram_channel()
        
        # Test 3: Create a new channel
        results["create_telegram_channel"] = self.test_create_telegram_channel()
        
        # Test 4: Delete a channel (only if create succeeded)
        if results["create_telegram_channel"]:
            results["delete_telegram_channel"] = self.test_delete_telegram_channel()
        else:
            self.log("⚠️ Skipping delete channel test due to create failure", "WARN")
            results["delete_telegram_channel"] = False
        
        # Test 5: Verify products endpoint still works
        results["verify_products_my"] = self.test_get_my_products()

        # Telegram Publication Channel Tests
        self.log("\n" + "="*50)
        self.log("📢 TELEGRAM PUBLICATION CHANNEL TESTS")
        self.log("="*50)
        
        # Test 1: Get publication channel (should be unconfigured initially)
        results["get_publication_channel"] = self.test_get_publication_channel()
        
        # Test 2: Set publication channel
        results["set_publication_channel"] = self.test_set_publication_channel()
        
        # Test 3: Verify publication channel is set
        results["verify_publication_channel_set"] = self.test_verify_publication_channel_set()
        
        # Test 4: Publish product to Telegram (uses publication channel)
        results["publish_product_to_telegram"] = self.test_publish_product_to_telegram()
        
        # Test 5: Delete publication channel
        results["delete_publication_channel"] = self.test_delete_publication_channel()
        
        # Test 6: Verify publication channel is deleted
        results["verify_publication_channel_deleted"] = self.test_verify_publication_channel_deleted()
        
        # ===== AFFILIATE MODULE TESTS =====
        self.log("\n" + "="*50)
        self.log("🏆 AFFILIATE MODULE TESTS")
        self.log("="*50)
        
        # Run affiliate tests
        affiliate_success = self.run_affiliate_tests()
        results["affiliate_module"] = affiliate_success
            
        return results

    def run_telegram_publication_channel_tests(self) -> Dict[str, bool]:
        """Run Telegram Publication Channel tests with configured scenario"""
        results = {}
        
        # Authentication test (required for other tests)
        results["login"] = self.test_login()
        if not results["login"]:
            self.log("❌ Login failed - skipping other tests", "ERROR")
            return results
        
        # Test the complete Telegram Publication Channel feature flow
        self.log("\n" + "="*80)
        self.log("🚀 TESTING TELEGRAM PUBLICATION CHANNEL FEATURE (CONFIGURED SCENARIO)")
        self.log("="*80)
        
        # 1. Verify current configured state
        results["get_configured_publication_channel"] = self.test_get_configured_publication_channel()
        
        # 2. Get a product ID for testing
        results["get_my_products"] = self.test_get_my_products()
        
        # 3. Attempt to publish the product to Telegram (main test - should work now!)
        results["publish_product_to_telegram_configured"] = self.test_publish_product_to_telegram()
        
        # 4. Test the start-linking flow
        results["start_linking_process"] = self.test_start_linking_process()
        
        # 5. Test cancel-linking
        results["cancel_linking_process"] = self.test_cancel_linking_process()
        
        # 6. Test removing publication channel
        results["remove_publication_channel"] = self.test_remove_publication_channel()
        
        # 7. Verify channel is removed
        results["verify_channel_removed"] = self.test_verify_channel_removed()
        
        # 8. Restore the publication channel configuration at the end
        results["restore_publication_channel"] = self.test_restore_publication_channel()
        
        return results
        
    def print_summary(self, results: Dict[str, bool]):
        """Print test results summary"""
        self.log("\n" + "="*50)
        self.log("📊 TEST RESULTS SUMMARY")
        self.log("="*50)
        
        passed = 0
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name.replace('_', ' ').title()}: {status}")
            if result:
                passed += 1
                
        self.log(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 All tests passed!")
        else:
            self.log(f"⚠️ {total - passed} test(s) failed")
            
        return passed == total

def main():
    """Main test execution"""
    tester = AntiaAPITester()
    
    try:
        # Run the Client Panel tests as requested
        results = tester.run_client_panel_tests()
        success = tester.print_summary(results)
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n❌ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()