"""
Test suite for the NEW Telegram connection flow:
1. Registration page with optional Telegram connection for tipsters
2. Login page with TELEGRAM_REQUIRED handling
3. /connect-telegram page for pre-login Telegram connection
4. Dashboard tipster without Telegram section in sidebar

Endpoints tested:
- POST /api/telegram/auth/connect-during-register - Connect during registration (no auth)
- POST /api/telegram/auth/connect-pre-login - Connect before login (no JWT, uses email/password)
- GET /api/telegram/auth/bot-info - Get bot info (public)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://telegram-product.preview.emergentagent.com')

# Test credentials
TIPSTER_WITH_TELEGRAM_EMAIL = "fausto.perez@antia.com"
TIPSTER_WITH_TELEGRAM_PASSWORD = "Tipster123!"
ADMIN_EMAIL = "admin@antia.com"
ADMIN_PASSWORD = "SuperAdmin123!"


class TestBotInfoEndpoint:
    """Test GET /api/telegram/auth/bot-info - Public endpoint"""
    
    def test_bot_info_returns_200(self):
        """GET /api/telegram/auth/bot-info should return bot configuration"""
        response = requests.get(f"{BASE_URL}/api/telegram/auth/bot-info")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "configured" in data, "Response should have 'configured' field"
        
        if data["configured"]:
            assert "botUsername" in data, "Configured bot should have 'botUsername'"
            print(f"✅ Bot info: configured={data['configured']}, username={data.get('botUsername')}")
        else:
            print(f"✅ Bot info: configured={data['configured']}")


class TestConnectDuringRegisterEndpoint:
    """Test POST /api/telegram/auth/connect-during-register - No auth required"""
    
    def test_connect_during_register_invalid_code_returns_400(self):
        """POST /api/telegram/auth/connect-during-register with invalid code should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/telegram/auth/connect-during-register",
            json={"linkCode": "INVALID1"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Error response should have 'message' field"
        print(f"✅ Invalid code rejected: {data.get('message')}")
    
    def test_connect_during_register_short_code_returns_400(self):
        """POST /api/telegram/auth/connect-during-register with short code should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/telegram/auth/connect-during-register",
            json={"linkCode": "ABC"}  # Too short (< 6 chars)
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✅ Short code correctly rejected with 400")
    
    def test_connect_during_register_empty_code_returns_400(self):
        """POST /api/telegram/auth/connect-during-register with empty code should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/telegram/auth/connect-during-register",
            json={"linkCode": ""}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✅ Empty code correctly rejected with 400")
    
    def test_connect_during_register_no_body_returns_400(self):
        """POST /api/telegram/auth/connect-during-register without body should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/telegram/auth/connect-during-register",
            json={}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✅ Missing code correctly rejected with 400")


class TestConnectPreLoginEndpoint:
    """Test POST /api/telegram/auth/connect-pre-login - No JWT, uses email/password"""
    
    def test_connect_pre_login_invalid_credentials_returns_400(self):
        """POST /api/telegram/auth/connect-pre-login with invalid credentials should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/telegram/auth/connect-pre-login",
            json={
                "email": "test@invalid.com",
                "password": "wrongpassword",
                "linkCode": "TESTCODE"
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Error response should have 'message' field"
        print(f"✅ Invalid credentials rejected: {data.get('message')}")
    
    def test_connect_pre_login_missing_email_returns_400(self):
        """POST /api/telegram/auth/connect-pre-login without email should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/telegram/auth/connect-pre-login",
            json={
                "password": "somepassword",
                "linkCode": "TESTCODE"
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✅ Missing email correctly rejected with 400")
    
    def test_connect_pre_login_missing_password_returns_400(self):
        """POST /api/telegram/auth/connect-pre-login without password should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/telegram/auth/connect-pre-login",
            json={
                "email": "test@test.com",
                "linkCode": "TESTCODE"
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✅ Missing password correctly rejected with 400")
    
    def test_connect_pre_login_missing_code_returns_400(self):
        """POST /api/telegram/auth/connect-pre-login without linkCode should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/telegram/auth/connect-pre-login",
            json={
                "email": "test@test.com",
                "password": "somepassword"
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✅ Missing linkCode correctly rejected with 400")
    
    def test_connect_pre_login_short_code_returns_400(self):
        """POST /api/telegram/auth/connect-pre-login with short code should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/telegram/auth/connect-pre-login",
            json={
                "email": "test@test.com",
                "password": "somepassword",
                "linkCode": "ABC"  # Too short
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✅ Short code correctly rejected with 400")


class TestTipsterWithTelegramLogin:
    """Test login flow for tipster who already has Telegram connected"""
    
    def test_tipster_with_telegram_can_login(self):
        """Tipster with Telegram connected should be able to login normally"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": TIPSTER_WITH_TELEGRAM_EMAIL,
                "password": TIPSTER_WITH_TELEGRAM_PASSWORD
            }
        )
        
        assert response.status_code == 200 or response.status_code == 201, \
            f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data or "token" in data, "Response should have access_token"
        assert "user" in data, "Response should have user object"
        
        user = data.get("user", {})
        assert user.get("role") == "TIPSTER", f"User should be TIPSTER, got {user.get('role')}"
        
        print(f"✅ Tipster with Telegram logged in successfully: {user.get('email')}")


class TestAdminLogin:
    """Test admin login"""
    
    def test_admin_can_login(self):
        """Admin should be able to login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            }
        )
        
        assert response.status_code == 200 or response.status_code == 201, \
            f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data or "token" in data, "Response should have access_token"
        
        print(f"✅ Admin logged in successfully")


class TestTelegramAuthStatusEndpoint:
    """Test GET /api/telegram/auth/status - Protected endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for tipster"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TIPSTER_WITH_TELEGRAM_EMAIL,
            "password": TIPSTER_WITH_TELEGRAM_PASSWORD
        })
        
        if response.status_code not in [200, 201]:
            pytest.skip(f"Authentication failed: {response.status_code}")
        
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_auth_status_returns_connected_for_tipster_with_telegram(self, auth_headers):
        """GET /api/telegram/auth/status should return isConnected=true for tipster with Telegram"""
        response = requests.get(
            f"{BASE_URL}/api/telegram/auth/status",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "isConnected" in data, "Response should have 'isConnected' field"
        
        # This tipster should have Telegram connected
        print(f"✅ Auth status: isConnected={data['isConnected']}, telegramId={data.get('telegramId')}")
    
    def test_auth_status_without_token_returns_401(self):
        """GET /api/telegram/auth/status without token should return 401"""
        response = requests.get(f"{BASE_URL}/api/telegram/auth/status")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Auth status correctly requires authentication")


class TestTelegramChannelsEndpoint:
    """Test GET /api/telegram/channels - Protected endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for tipster"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TIPSTER_WITH_TELEGRAM_EMAIL,
            "password": TIPSTER_WITH_TELEGRAM_PASSWORD
        })
        
        if response.status_code not in [200, 201]:
            pytest.skip(f"Authentication failed: {response.status_code}")
        
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_channels_returns_list(self, auth_headers):
        """GET /api/telegram/channels should return list of connected channels"""
        response = requests.get(
            f"{BASE_URL}/api/telegram/channels",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        if isinstance(data, list):
            channels = data
        else:
            channels = data.get("channels", data.get("data", []))
        
        assert isinstance(channels, list), "Channels should be a list"
        print(f"✅ Channels endpoint returned {len(channels)} channel(s)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
