import os
import zipfile
import shutil
import tarfile

# Files and folders to include
files_to_add = [
    'package.json',
    'package-lock.json',
    '.env',
    '.env.example',
    'ALIYUN_DEPLOY_GUIDE.md',
    'aliyun_passenger_deploy.html',
    'passenger_order.html'
]

dist_folder = 'dist'
zip_filename = 'daijia_deploy.zip'
tar_filename = 'daijia_deploy.tar.gz'

def main():
    # 1. Ensure files exist or copy them to dist
    print("Preparing deployment files...")
    
    # Copy template HTMLs into dist just in case
    if os.path.exists('passenger_order.html'):
        shutil.copy('passenger_order.html', os.path.join(dist_folder, 'passenger_order.html'))
        print("Copied passenger_order.html to dist/")
    if os.path.exists('aliyun_passenger_deploy.html'):
        shutil.copy('aliyun_passenger_deploy.html', os.path.join(dist_folder, 'aliyun_passenger_deploy.html'))
        print("Copied aliyun_passenger_deploy.html to dist/")

    # 2. Write zip file
    print("Creating zip file using ZIP_DEFLATED compression...")
    
    # Remove existing zip if any
    if os.path.exists(zip_filename):
        os.remove(zip_filename)
        
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Add root files
        for file in files_to_add:
            if os.path.exists(file):
                zipf.write(file, file)
                print(f"Added file to ZIP: {file}")
            else:
                print(f"Warning: {file} not found, skipping.")

        # Add dist folder
        if os.path.exists(dist_folder):
            for root, dirs, files in os.walk(dist_folder):
                for file in files:
                    if file.endswith('.zip') or file.endswith('.gz') or file.endswith('.tar'):
                        continue
                    filepath = os.path.join(root, file)
                    arcname = os.path.relpath(filepath, os.path.dirname(dist_folder))
                    zipf.write(filepath, arcname)
            print("Added dist/ folder contents to ZIP.")

    # Copy to dist/ to make it downloadable via static server
    shutil.copy(zip_filename, os.path.join(dist_folder, zip_filename))
    print(f"Successfully created {zip_filename}!")

    # 3. Write tar.gz file (100% Native Linux compatibility for Baota Panel)
    print("Creating tar.gz file for native Baota Panel support...")
    if os.path.exists(tar_filename):
        os.remove(tar_filename)
        
    with tarfile.open(tar_filename, "w:gz") as tar:
        # Add root files
        for file in files_to_add:
            if os.path.exists(file):
                tar.add(file, arcname=file)
                print(f"Added file to TAR: {file}")
                
        # Add dist folder
        if os.path.exists(dist_folder):
            for root, dirs, files in os.walk(dist_folder):
                for file in files:
                    if file.endswith('.zip') or file.endswith('.gz') or file.endswith('.tar'):
                        continue
                    filepath = os.path.join(root, file)
                    # We want the inside files to be archived as dist/...
                    arcname = os.path.relpath(filepath, os.path.dirname(dist_folder))
                    tar.add(filepath, arcname=arcname)
            print("Added dist/ folder contents to TAR.")

    # Copy to dist/
    shutil.copy(tar_filename, os.path.join(dist_folder, tar_filename))
    print(f"Successfully created {tar_filename} and copied to dist/!")

if __name__ == '__main__':
    main()
