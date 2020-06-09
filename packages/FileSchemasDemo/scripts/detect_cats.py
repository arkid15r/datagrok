#name: Detect Cats
#description: Detects cats on image
#language: python
#input: file file
#output: bool hasCats
#tags: demo, files, panel, ml, opencv
#condition: file.isFile && file.size < 1e6 && file.path.contains("/cats/") && (file.name.endsWith("jpg") || file.name.endsWith("jpeg"))

import cv2

image = cv2.imread(file)
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
detector = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalcatface.xml")
hasCats = len(detector.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=3, minSize=(75, 75))) != 0
