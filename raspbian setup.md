crontab setup to turn off screen at night

```
0 22 * * * wlr-randr --output HDMI-A-1 --off
0  8 * * * wlr-randr --output HDMI-A-1 --on
```

autostart setup

`nano .config/labwc/autostart`
```
chromium https://photos.dlister.ca/slideshow --kiosk --noerrdialogs --disable-infobars --no-first-run --enable-features=OverlayScrollbar --start-maximized &
```