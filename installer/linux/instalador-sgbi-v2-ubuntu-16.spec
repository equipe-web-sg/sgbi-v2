# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all

rich_datas, rich_binaries, rich_hiddenimports = collect_all('rich')

datas = [('resources', 'resources')] + rich_datas
binaries = [] + rich_binaries
hiddenimports = [
    'mysql.connector',
    'mysql.connector.plugins.mysql_native_password'
] + rich_hiddenimports

a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports + ['flows', 'utils', 'config'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='instalador-sgbi-v2-ubuntu-16-ate-22',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
