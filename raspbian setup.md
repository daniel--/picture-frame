# Raspbian Setup Guide

## Setting up Crontab to Turn Off Screen at Night

To automatically turn off the HDMI display at 10 PM and turn it back on at 8 AM, add the following lines to your crontab:

```sh
0 22 * * * wlr-randr --output HDMI-A-1 --off
0  8 * * * wlr-randr --output HDMI-A-1 --on
```

Edit your crontab with:
```sh
crontab -e
```

---

## Autostart Setup

Set up Chromium to autostart in kiosk mode on boot.

Edit (or create) the file `~/.config/labwc/autostart`:

```sh
chromium https://photos.dlister.ca/slideshow --kiosk --noerrdialogs --disable-infobars --no-first-run --enable-features=OverlayScrollbar --start-maximized &
```

Make sure this file is executable and LabWC loads it on startup.