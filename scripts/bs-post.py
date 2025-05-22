import requests
import json
from datetime import datetime, timezone
import os
import re
import mimetypes
import sys
import keyring
import getpass

# Your Bluesky credentials and API URLs
credentials = keyring.get_password('bsky-u', 'u')
if len(sys.argv) > 1 and sys.argv[1] == 'update-credentials':
        keyring.delete_password('bsky-u','u')
        keyring.delete_password('bsky-p','p')
        keyring.delete_password('bsky-pds','pds')
        credentials=None

if credentials is None:
    username = input("bluesky handle: ")
    password = getpass.getpass(prompt='bluesky password: ')
    pds_url = input("bluesky pds url: ")
    keyring.set_password('bsky-u','u', username)
    keyring.set_password('bsky-p','p', password)
    keyring.set_password('bsky-pds','pds', pds_url)
else:
    handle = keyring.get_password('bsky-u','u')
    app_password = keyring.get_password('bsky-p','p')
    pds_url = keyring.get_password('bsky-pds','pds')
    session_endpoint = f'{pds_url}/xrpc/com.atproto.server.createSession'
    post_endpoint = f'{pds_url}/xrpc/com.atproto.repo.createRecord'
    upload_image_endpoint = f'{pds_url}/xrpc/com.atproto.repo.uploadBlob'
    resolve_handle_endpoint = f'{pds_url}/xrpc/com.atproto.identity.resolveHandle'
    post_text = sys.argv[1]
    post_image = sys.argv[2]
    image_desc = sys.argv[3]
    session = {}
    def create_session():
        session_data = {'identifier': handle, 'password': app_password}
        session_response = requests.post(session_endpoint, json=session_data)
        session_response.raise_for_status()
        global session
        session = session_response.json()
        print("Session created:", session)
    def upload_image(image_path, alt_text):
        if not os.path.exists(image_path):
            print(f"Error: Image file not found at path: {image_path}")
            return None
        mime_type, _ = mimetypes.guess_type(image_path)
        if mime_type is None:
            print("Error: Could not determine MIME type for the image.")
            return None
        with open(image_path, 'rb') as image_file:
            img_bytes = image_file.read()
        if len(img_bytes) > 1000000:
            print(f"Error: Image file size too large. Max 1MB, got {len(img_bytes)} bytes.")
            return None
        headers = {'Content-Type': mime_type, 'Authorization': f"Bearer {session['accessJwt']}"}
        image_response = requests.post(upload_image_endpoint, headers=headers, data=img_bytes)
        image_response.raise_for_status()
        return {'blob': image_response.json()['blob'], 'alt': alt_text}
    def resolve_handle(username):
        """Resolve the DID for a given username on Bluesky."""
        response = requests.get(f"{resolve_handle_endpoint}?handle={username}")
        response.raise_for_status()
        return response.json().get('did')
    def parse_mentions(content):
        """Parse and replace @mentions in the content with DID references."""
        mentions = re.findall(r'@(\w+)', content)
        facets = []
        offset = 0  
        for mention in mentions:
            did = resolve_handle(mention + '.bsky.social')
            if did:
                mention_index = content.find(f"@{mention}", offset)
                if mention_index != -1:
                    facets.append({
                        "index": {
                            "byteStart": mention_index,
                            "byteEnd": mention_index + len(mention) + 1
                        },
                        "features": [{
                            "$type": "app.bsky.richtext.facet#mention",
                            "did": did
                        }]
                    })
                    offset = mention_index + len(mention) + 1
            else:
                print(f"Could not resolve DID for @{mention}")
        return facets, content
    def create_post(content, image_path=None, alt_text="An image attached to the post"):
        facets, parsed_content = parse_mentions(content)
        post_data = {
            '$type': 'app.bsky.feed.post',
            'text': parsed_content,
            'createdAt': datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            'facets': facets
        }
        if image_path:
            image_response = upload_image(image_path, alt_text)
            if not image_response or 'blob' not in image_response:
                print("Error: Failed to retrieve blob from image upload response")
                return
            post_data['embed'] = {
                '$type': 'app.bsky.embed.images',
                'images': [{'image': image_response['blob'], 'alt': image_response['alt']}]
            }
        record_data = {
            'repo': session['did'],
            'collection': 'app.bsky.feed.post',
            'record': post_data
        }
        headers = {'Authorization': f"Bearer {session['accessJwt']}"}
        post_response = requests.post(post_endpoint, headers=headers, json=record_data)
        post_response.raise_for_status()
        return post_response.json()
    if __name__ == '__main__':
        try:
            create_session()
            post_content = post_text
            image_path = post_image.strip()
            # Request alt text if an image is provided
            if image_path:
                alt_text = image_desc
            else:
                alt_text = "An image attached to the post"
            response = create_post(post_content, image_path or None, alt_text)
            if response:
                print("Post successful!")
                print(json.dumps(response, indent=2))
        except requests.exceptions.HTTPError as err:
            print("HTTP Error:", err)
        except Exception as e:
            print("An unexpected error occurred:", e)