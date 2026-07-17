import re

file_path = 'tests/test_admin_api.py'
with open(file_path, 'r') as f:
    content = f.read()

# Replace get_super_admin_and_token
new_super_helper = '''
def get_super_admin_and_token(client, unique_id):
    import uuid
    email = f"super_{unique_id}@example.com"
    phone = f"1{unique_id}"
    client.post('/auth/register', json={
        'user_name': f'super_{unique_id}',
        'user_email': email,
        'user_password': 'password123',
        'user_phone_no': phone,
        'user_address': 'Test HQ',
        'role': 'super_admin',
        'super_admin_secret': 'SUPER_SECRET_SUPER_ADMIN_KEY'
    })
    resp = client.post('/auth/login', json={
        'user_email': email,
        'user_password': 'password123',
        'role': 'super_admin'
    })
    assert resp.status_code == 200, resp.data
    return resp.json['access_token']
'''
pattern = r'def get_super_admin_and_token\(client, unique_id\):.*?(?=def get_admin_and_token)'
content = re.sub(pattern, new_super_helper, content, flags=re.DOTALL)

# Replace get_admin_and_token
new_admin_helper = '''
def get_admin_and_token(client, unique_id, super_admin_token):
    admin_email = f'admin_{unique_id}@example.com'
    admin_phone = f'2{unique_id[:6]}'
    admin_password = 'adminpass'
    reg_resp = client.post('/admin/register_admin', json={
        'user_name': f'admin_{unique_id}',
        'user_email': admin_email,
        'user_password': admin_password,
        'user_phone_no': admin_phone,
        'user_address': 'Admin Desk'
    }, headers={'Authorization': f'Bearer {super_admin_token}'})
    assert reg_resp.status_code == 201, reg_resp.data
    resp = client.post('/auth/login', json={
        'user_email': admin_email,
        'user_password': admin_password,
        'role': 'admin'
    })
    assert resp.status_code == 200, resp.data
    admin_token = resp.json['access_token']
    admin_id = resp.json['user_id']
    return admin_token, admin_id, admin_email, admin_password
'''
pattern2 = r'def get_admin_and_token\(client, unique_id, super_admin_token\):.*?(?=def test_admin_lot_assignment_flow)'
content = re.sub(pattern2, new_admin_helper, content, flags=re.DOTALL)

with open(file_path, 'w') as f:
    f.write(content)
print("test_admin_api.py helper functions patched.")
