import os
import zipfile
import shutil
import subprocess

files_to_add = [
    'package.json',
    'package-lock.json',
    '.env',
    '.env.example',
    'ALIYUN_DEPLOY_GUIDE.md',
    'aliyun_passenger_deploy.html',
    'passenger_order.html',
    'vip_banner.jpg',
    'welcome_bg.jpg',
    'hwdjtb.png',
    'capacitor.config.json'
]

dist_folder = 'dist'
zip_filenames = ['daijia_deploy.zip', 'baota_deploy.zip']
tar_filename = 'daijia_deploy.tar.gz'
tar_plain_filename = 'daijia_deploy.tar'

def main():
    print("Preparing deployment files...")
    
    # 1. Copy template HTMLs into dist folder if needed
    if os.path.exists('passenger_order.html'):
        try:
            shutil.copy('passenger_order.html', os.path.join(dist_folder, 'passenger_order.html'))
            print("Copied passenger_order.html to dist/")
        except Exception as e:
            print("Warning copying passenger_order.html:", e)

    if os.path.exists('vip_banner.jpg'):
        try:
            shutil.copy('vip_banner.jpg', os.path.join(dist_folder, 'vip_banner.jpg'))
            print("Copied vip_banner.jpg to dist/")
        except Exception as e:
            print("Warning copying vip_banner.jpg:", e)

    if os.path.exists('welcome_bg.jpg'):
        try:
            shutil.copy('welcome_bg.jpg', os.path.join(dist_folder, 'welcome_bg.jpg'))
            print("Copied welcome_bg.jpg to dist/")
        except Exception as e:
            print("Warning copying welcome_bg.jpg:", e)

    if os.path.exists('hwdjtb.png'):
        try:
            shutil.copy('hwdjtb.png', os.path.join(dist_folder, 'hwdjtb.png'))
            print("Copied hwdjtb.png to dist/")
        except Exception as e:
            print("Warning copying hwdjtb.png:", e)
            
    if os.path.exists('aliyun_passenger_deploy.html'):
        try:
            shutil.copy('aliyun_passenger_deploy.html', os.path.join(dist_folder, 'aliyun_passenger_deploy.html'))
            print("Copied aliyun_passenger_deploy.html to dist/")
        except Exception as e:
            print("Warning copying aliyun_passenger_deploy.html:", e)

    # 2. Build standard, compliant ZIP file using ZipFile
    print("Creating ZIP package with ZIP_DEFLATED compression...")
    temp_zip = 'deploy_build_temp.zip'
    if os.path.exists(temp_zip):
        os.remove(temp_zip)

    with zipfile.ZipFile(temp_zip, 'w', compression=zipfile.ZIP_DEFLATED) as zipf:
        # Add root files
        for file in files_to_add:
            if os.path.exists(file) and os.path.isfile(file):
                zipf.write(file, file)
                print(f"Added file: {file}")

        # Add dist folder contents
        if os.path.exists(dist_folder) and os.path.isdir(dist_folder):
            for root, dirs, files in os.walk(dist_folder):
                for file in files:
                    if file.endswith(('.zip', '.gz', '.tar', '.tmp')):
                        continue
                    filepath = os.path.join(root, file)
                    arcname = os.path.relpath(filepath, os.path.dirname(dist_folder))
                    zipf.write(filepath, arcname)
            print("Added dist/ folder contents to ZIP archive.")

    # Deploy ZIP copies to root, dist/, and public/
    public_folder = 'public'
    if not os.path.exists(public_folder):
        os.makedirs(public_folder, exist_ok=True)

    for name in zip_filenames:
        shutil.copy(temp_zip, name)
        dist_path = os.path.join(dist_folder, name)
        if os.path.exists(dist_folder):
            shutil.copy(temp_zip, dist_path)
        public_path = os.path.join(public_folder, name)
        shutil.copy(temp_zip, public_path)
        print(f"✓ Deployed ZIP file to: {name}, {dist_path}, and {public_path}")

    if os.path.exists(temp_zip):
        os.remove(temp_zip)

    # 3. Safely attempt tar creation without breaking ZIP generation
    existing_files_to_add = [f for f in files_to_add if os.path.exists(f)]
    if os.path.exists(dist_folder):
        existing_files_to_add.append(dist_folder)

    try:
        print("Creating tar.gz archive...")
        cmd_targz = ["tar", "-czf", tar_filename, "--exclude=*.zip", "--exclude=*.tar.gz", "--exclude=*.tar", "--exclude=*.tmp"] + existing_files_to_add
        subprocess.run(cmd_targz, check=False)
        if os.path.exists(tar_filename) and os.path.exists(dist_folder):
            shutil.copy(tar_filename, os.path.join(dist_folder, tar_filename))
            print("✓ Copied tar.gz to dist/")
    except Exception as e:
        print("Tar gz warning (non-fatal):", e)

    try:
        print("Creating tar plain archive...")
        cmd_tar = ["tar", "-cf", tar_plain_filename, "--exclude=*.zip", "--exclude=*.tar.gz", "--exclude=*.tar", "--exclude=*.tmp"] + existing_files_to_add
        subprocess.run(cmd_tar, check=False)
        if os.path.exists(tar_plain_filename) and os.path.exists(dist_folder):
            shutil.copy(tar_plain_filename, os.path.join(dist_folder, tar_plain_filename))
            print("✓ Copied tar to dist/")
    except Exception as e:
        print("Tar plain warning (non-fatal):", e)

    print("\n🎉 Deployment ZIP build completed successfully!")

if __name__ == '__main__':
    main()
