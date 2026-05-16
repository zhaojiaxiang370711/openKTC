# OpenKTV NAS Media

OpenKTV should use the Feiniu NAS share as the durable media store:

- SMB URL: `smb://xfn.local/nas_hdd/`
- Local mount point: `/home/x/code/openktv/app/media/nas_hdd`

Karaoke Mugen/OpenKTV media code expects normal filesystem paths for downloads, scans, previews, and mpv playback. Do not put the raw `smb://...` URL into `app/config.yml`; mount it locally first.

## Manual Mount

```sh
mkdir -p /home/x/code/openktv/app/media/nas_hdd
sudo mount -t cifs //xfn.local/nas_hdd /home/x/code/openktv/app/media/nas_hdd \
  -o username=<NAS_USER>,uid=$(id -u),gid=$(id -g),iocharset=utf8,vers=3.0
```

If the NAS allows guest access, replace the username option with `guest`.

## Expected Layout

```text
/home/x/code/openktv/app/media/nas_hdd/
  kara.moe/medias/
  My Custom Songs/medias/
```

With the local config pointing repository `Path.Medias` entries at these folders:

```yaml
System:
  Repositories:
    - Name: kara.moe
      Path:
        Medias:
          - /home/x/code/openktv/app/media/nas_hdd/kara.moe/medias
    - Name: My Custom Songs
      Path:
        Medias:
          - /home/x/code/openktv/app/media/nas_hdd/My Custom Songs/medias
```

This makes repository media downloads land on the NAS and makes playback resolve local files from the same NAS-backed folders.
