import os
import zipfile
import shutil
import subprocess

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
tar_plain_filename = 'daijia_deploy.tar'

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
    
    zip_temp = zip_filename + '.tmp'
    if os.path.exists(zip_temp):
        os.remove(zip_temp)
        
    with zipfile.ZipFile(zip_temp, 'w', zipfile.ZIP_DEFLATED) as zipf:
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
                    if file.endswith('.zip') or file.endswith('.gz') or file.endswith('.tar') or file.endswith('.tmp'):
                        continue
                    filepath = os.path.join(root, file)
                    arcname = os.path.relpath(filepath, os.path.dirname(dist_folder))
                    zipf.write(filepath, arcname)
            print("Added dist/ folder contents to ZIP.")

    # Atomic rename/overwrite
    if os.path.exists(zip_filename):
        os.remove(zip_filename)
    os.rename(zip_temp, zip_filename)

    # Copy to dist/ to make it downloadable via static server
    shutil.copy(zip_filename, os.path.join(dist_folder, zip_filename))
    print(f"Successfully created {zip_filename}!")

    # Existing list of real files to add to command (only those that actually exist)
    existing_files_to_add = [f for f in files_to_add if os.path.exists(f)]
    if os.path.exists(dist_folder):
        existing_files_to_add.append(dist_folder)

    # 3. Write tar.gz file using 100% Native Linux tar command for perfect Baota Panel support
    print("Creating tar.gz file via native Linux tar...")
    if os.path.exists(tar_filename):
        os.remove(tar_filename)
    
    cmd_targz = [
        "tar", "-czf", tar_filename,
        "--exclude=*.zip", "--exclude=*.tar.gz", "--exclude=*.tar", "--exclude=*.tmp",
    ] + existing_files_to_add
    
    subprocess.run(cmd_targz, check=True)
    shutil.copy(tar_filename, os.path.join(dist_folder, tar_filename))
    print(f"Successfully created native {tar_filename} and copied to dist/!")

    # 4. Write plain .tar file (uncompressed) using native Linux tar command
    print("Creating plain .tar file via native Linux tar...")
    if os.path.exists(tar_plain_filename):
        os.remove(tar_plain_filename)

    cmd_tar = [
        "tar", "-cf", tar_plain_filename,
        "--exclude=*.zip", "--exclude=*.tar.gz", "--exclude=*.tar", "--exclude=*.tmp",
    ] + existing_files_to_add

    subprocess.run(cmd_tar, check=True)
    shutil.copy(tar_plain_filename, os.path.join(dist_folder, tar_plain_filename))
    print(f"Successfully created native {tar_plain_filename} and copied to dist/!")

if __name__ == '__main__':
    main()
