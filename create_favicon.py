from PIL import Image, ImageDraw

# Create a simple 16x16 icon
img = Image.new('RGB', (16, 16), color='#0f172a')
draw = ImageDraw.Draw(img)
draw.rectangle([4, 4, 12, 12], fill='#3b82f6')
img.save('favicon.ico')