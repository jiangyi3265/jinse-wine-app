"""Package source and compiled artifacts, excluding installed dependencies and local caches."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import os

project = Path(__file__).resolve().parents[1]
output = project.parent / 'output' / '金色酒业小程序前端V3.zip'
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for current, dirs, files in os.walk(project):
        dirs[:] = [name for name in dirs if name not in {'node_modules', '.git', '.hbuilderx', 'unpackage', 'views', '.vite'}]
        current = Path(current)
        if current == project / 'dist':
            dirs[:] = [name for name in dirs if name == 'build']
        for name in files:
            path = current / name
            if name.startswith('.env') or name == '.DS_Store':
                continue
            archive.write(path, '金色酒业/' + path.relative_to(project).as_posix())
    screenshots = project.parent / 'output' / 'frontend-qa'
    for name in ['all-pages.png', 'responsive-audit.json', 'final-route-audit.json', '海报导出测试.png']:
        if (screenshots / name).is_file():
            archive.write(screenshots / name, '验收截图/' + name)
with ZipFile(output) as archive:
    assert archive.testzip() is None
    print(f'{output}\n{len(archive.namelist())} files, {output.stat().st_size:,} bytes, ZIP verified')
