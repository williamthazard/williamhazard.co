import asyncio
import monome
from screeninfo import get_monitors
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options

chrome_options = Options()
chrome_options.add_argument("--autoplay-policy=no-user-gesture-required") 

for monitor in get_monitors():
    width = monitor.width
    height = monitor.height

delay = 45 #seconds
driver_count = 2
count = 0
urls = ['https://williamhazard.co/gbg','https://williamhazard.co/gbg']
elems = [0,0]
driver = []
for i in range(driver_count):
    driver.append(webdriver.Chrome(options=chrome_options))
    driver[i].get(urls[i])
    driver[i].set_window_size(width/2-1, height)
    myElem = WebDriverWait(driver[i], delay).until(EC.presence_of_element_located((By.TAG_NAME, 'a')))
    elems[i] = driver[i].find_elements(By.TAG_NAME, "a")
    for index, elem in enumerate(elems[i]):
        print("window", i, " link", index, ": ", elem.get_attribute("href"))

driver[0].set_window_position(0, 0)
driver[1].set_window_position(width/2+2,0)

class GridStudies(monome.GridApp):
    def __init__(self):
        super().__init__()
        # .. initialize other instance variables ..
        self.width = 0
        self.height = 0
        # build a task to further the action:
        self.play_task = asyncio.ensure_future(self.play())
    
    # when grid is plugged in via USB:
    def on_grid_ready(self):
        self.width = self.grid.width
        self.height = self.grid.height
        self.sequencer_cols = self.width/2
        print('sequencer cols: ',self.sequencer_cols)
        self.connected = True
        self.count = 0
        # draw our interface:
        self.draw()
    
    # when grid is physically disconnected:
    def on_grid_disconnect(self, *args):
        self.connected = False
        for i in range(driver_count):
            driver[i].quit()

    async def play(self):
        while True:
            await asyncio.sleep(0.1)
            self.draw()

    def on_grid_key(self, x, y, s):
        self.count = self.count + 1
        if self.count%2 == 1:
            if x < self.sequencer_cols:
                print("region A key:", x, y, s)
                if (x + (y*self.sequencer_cols)) < len(elems[0]):
                    dest = elems[0][x+(y*int(self.sequencer_cols))].get_attribute("href")
                    print(dest)
                    driver[0].get(dest)
                    myElem = WebDriverWait(driver[0], delay).until(EC.presence_of_element_located((By.TAG_NAME, 'a')))
                    elems[0] = driver[0].find_elements(By.TAG_NAME, "a")
                    for index, elem in enumerate(elems[0]):
                        print("window 0 link", index, ": ", elem.get_attribute("href"))
            else:
                print("region B key:", x-int(self.sequencer_cols), y, s)
                if (x-int(self.sequencer_cols)) + (y*self.sequencer_cols) < len(elems[1]):
                    dest = elems[1][(x-int(self.sequencer_cols))+(y*int(self.sequencer_cols))].get_attribute("href")
                    print(dest)
                    driver[1].get(dest)
                    myElem = WebDriverWait(driver[1], delay).until(EC.presence_of_element_located((By.TAG_NAME, 'a')))
                    elems[1] = driver[1].find_elements(By.TAG_NAME, "a")
                    for index, elem in enumerate(elems[1]):
                        print("window 0 link", index, ": ", elem.get_attribute("href"))

            self.grid.led_level_set(x, y, s * 15)

    def draw(self):
        buffer = monome.GridBuffer(self.width, self.height)

        for x in range(self.width):
            if x > int(self.sequencer_cols-1):
                for y in range(self.height):
                    buffer.led_level_set(x, y, 2)
        
        for x in range(self.width):
            if x < int(self.sequencer_cols):
                for y in range(self.height):
                    if (x + (y*self.sequencer_cols)) < len(elems[0]):
                        buffer.led_level_set(x, y, 4)

        for x in range(self.width):
            if x > int(self.sequencer_cols-1):
                for y in range(self.height):
                    if (x-int(self.sequencer_cols)) + (y*self.sequencer_cols) < len(elems[1]):
                        buffer.led_level_set(x, y, 4)

        # update grid
        if self.connected:
            buffer.render(self.grid)

async def main():
    loop = asyncio.get_running_loop()
    grid_studies = GridStudies()

    def serialosc_device_added(id, type, port):
        print('connecting to {} ({})'.format(id, type))
        asyncio.ensure_future(grid_studies.grid.connect('127.0.0.1', port))

    serialosc = monome.SerialOsc()
    serialosc.device_added_event.add_handler(serialosc_device_added)

    await serialosc.connect()
    await loop.create_future()

if __name__ == '__main__':
    asyncio.run(main())