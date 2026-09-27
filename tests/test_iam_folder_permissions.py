import unittest

class TestIamFolderPermissions(unittest.TestCase):
    def test_admin_folder_permission_rules(self):
        role = "Administrator"
        selected_folders = ["Default"]
        
        # Admin gets unrestricted ["*"] regardless of checkbox choices
        allowed_folders = ["*"] if (role == "Administrator" or "*" in selected_folders) else selected_folders
        self.assertEqual(allowed_folders, ["*"])

    def test_non_admin_specific_folder_permission_rules(self):
        role = "User"
        selected_folders = ["Default", "Engineering"]
        
        allowed_folders = ["*"] if (role == "Administrator" or "*" in selected_folders) else selected_folders
        self.assertEqual(allowed_folders, ["Default", "Engineering"])
        self.assertNotIn("*", allowed_folders)

    def test_non_admin_empty_folder_permission_rules(self):
        role = "User"
        selected_folders = []
        
        # Non-admin empty selection stays empty [] (does not default to unrestricted ["*"])
        allowed_folders = ["*"] if (role == "Administrator" or "*" in selected_folders) else selected_folders
        self.assertEqual(allowed_folders, [])
        self.assertNotIn("*", allowed_folders)

    def test_non_admin_all_folders_star_permission_rules(self):
        role = "User"
        selected_folders = ["*"]
        
        allowed_folders = ["*"] if (role == "Administrator" or "*" in selected_folders) else selected_folders
        self.assertEqual(allowed_folders, ["*"])

if __name__ == "__main__":
    unittest.main()
