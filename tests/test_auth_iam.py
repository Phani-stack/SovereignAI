import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.core.services import auth_service


class TestAuthIAM(unittest.TestCase):

    def setUp(self):
        auth_service.initialize_default_users(force=True)

    def test_default_users_exist(self):
        users = auth_service.list_all_users()
        usernames = [u["username"] for u in users]
        self.assertIn("admin", usernames)
        self.assertIn("user", usernames)
        self.assertIn("viewer", usernames)

    def test_admin_login(self):
        token, user = auth_service.authenticate_user("admin", "admin123")
        self.assertIsNotNone(token)
        self.assertEqual(user["username"], "admin")
        self.assertEqual(user["role"], "Administrator")
        self.assertTrue(auth_service.has_ability(user, "can_manage_users"))
        self.assertTrue(auth_service.has_ability(user, "can_upload_documents"))

    def test_invalid_password(self):
        token, err = auth_service.authenticate_user("admin", "wrongpassword")
        self.assertIsNone(token)
        self.assertIn("Invalid password", err)

    def test_user_creation_and_abilities(self):
        test_user = "test_engineer_" + Path(__file__).stem
        # Clean up if exists
        try:
            auth_service.delete_user(test_user)
        except Exception:
            pass

        created = auth_service.create_user(
            username=test_user,
            password="password123",
            role="User",
            abilities=["can_use_chat", "can_execute_code"],
            allowed_documents=["tech_spec.pdf"],
        )
        self.assertEqual(created["username"], test_user)
        self.assertTrue(auth_service.has_ability(created, "can_use_chat"))
        self.assertTrue(auth_service.has_ability(created, "can_execute_code"))
        self.assertFalse(auth_service.has_ability(created, "can_manage_users"))
        self.assertFalse(auth_service.has_ability(created, "can_upload_documents"))

        # Test document access control
        self.assertTrue(auth_service.can_access_document(created, "tech_spec.pdf"))
        self.assertFalse(auth_service.can_access_document(created, "confidential_financials.pdf"))

        # Clean up
        auth_service.delete_user(test_user)


if __name__ == "__main__":
    unittest.main()
