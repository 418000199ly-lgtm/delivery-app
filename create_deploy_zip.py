import zipfile
import os
import shutil

zip_filename = 'daijia_deploy.zip'
files_to_add = [
    'package.json',
    'package-lock.json',
    '.env.example',
    'aliyun_passenger_deploy.html',
    'passenger_order.html'
]

# Ensure the passenger HTML files are also copied into dist so they are served correctly as static files
dist_dir = 'dist'
if os.path.exists(dist_dir):
    for f in ['passenger_order.html', 'aliyun_passenger_deploy.html']:
        if os.path.exists(f):
            shutil.copy(f, os.path.join(dist_dir, f))
            print(f'Copied {f} to {dist_dir}/')

folders_to_add = [
    'dist'
]

print('Creating zip file...')
if os.path.exists(zip_filename):
    os.remove(zip_filename)

with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
    # Add files
    for f in files_to_add:
        if os.path.exists(f):
            zipf.write(f)
            print(f'Added file: {f}')
        else:
            print(f'Warning: File {f} does not exist!')
            
    # Add folders
    for folder in folders_to_add:
        if os.path.exists(folder):
            for root, dirs, files in os.walk(folder):
                for file in files:
                    # Explicitly ignore zip, gz, tar files inside dist/ to avoid circular reference or corruption
                    if file.endswith('.zip') or file.endswith('.gz') or file.endswith('.tar'):
                        print(f'Skipping archive file: {file}')
                        continue
                    filepath = os.path.join(root, file)
                    arcname = os.path.relpath(filepath, os.path.dirname(folder))
                    zipf.write(filepath, arcname)
            print(f'Added folder: {folder}')
        else:
            print(f'Warning: Folder {folder} does not exist!')

print('Successfully created daijia_deploy.zip!')

# Copy the zip file into dist/ so it can be served as a static asset in the preview
if os.path.exists(dist_dir):
    shutil.copy(zip_filename, os.path.join(dist_dir, zip_filename))
    print(f'Successfully copied {zip_filename} to {dist_dir}/ for static serving.')
