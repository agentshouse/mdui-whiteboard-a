# Reproduce notices from the bundled donor font metadata, preserving its text.
from fontTools.ttLib import TTFont
from pathlib import Path
root = Path(__file__).resolve().parent.parent
parts=['WHITEBOARD FONT NOTICES\n\nVerbatim metadata of bundled donor fonts, grouped by family.\n']
seen=set()
for path in sorted((root/'packages/excalidraw/fonts').rglob('*.woff2')):
    font=TTFont(path)
    metadata=[]
    for entry in font['name'].names:
        if entry.nameID in (0,13,14):
            try:
                text=entry.toUnicode()
                if text not in metadata: metadata.append(text)
            except UnicodeError: pass
    key=(path.parent.name,tuple(metadata))
    if key in seen: continue
    seen.add(key)
    parts.append('\n'+'='*80+'\n'+path.parent.name+'\n\n'+'\n\n'.join(metadata)+'\n')
for path in sorted((root/'packages/excalidraw/fonts').rglob('index.ts')):
    text=path.read_text()
    if '/*' in text:
        start=text.index('/*');end=text.index('*/',start)+2
        parts.append('\n'+'='*80+'\n'+str(path.relative_to(root))+'\n\n'+text[start:end]+'\n')
(root/'public/FONT_NOTICES.txt').write_text(''.join(parts))
print(f'Wrote {len(seen)} font metadata records')
