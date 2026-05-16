# OpenKTV NAS Media

OpenKTV should use the Feiniu NAS share as the durable media store:

- Primary SMB URL: `smb://192.168.0.109/nas_hdd/`
- SSD import source: `smb://xfn.local/nas_ssd/`
- Local mount point: `/home/x/code/openktv/app/media/nas_hdd`

Karaoke Mugen/OpenKTV media code expects normal filesystem paths for downloads, scans, previews, and mpv playback. Do not put the raw `smb://...` URL into `app/config.yml`; mount it locally first.

## Manual Mount

```sh
mkdir -p /home/x/code/openktv/app/media/nas_hdd
sudo mount -t cifs //192.168.0.109/nas_hdd /home/x/code/openktv/app/media/nas_hdd \
  -o credentials=/home/x/.config/openktv/nas-credentials,uid=$(id -u),gid=$(id -g),iocharset=utf8,vers=3.0,noperm
```

The credentials file is local-private and must not be committed:

```text
username=<NAS_USER>
password=<NAS_PASSWORD>
domain=WORKGROUP
```

Use `chmod 600 /home/x/.config/openktv/nas-credentials` after creating it.

If the NAS allows guest access, replace the credentials option with `guest`.

## Expected Layout

```text
/home/x/code/openktv/app/media/nas_hdd/
  kara.moe/medias/
  My Custom Songs/medias/
  016.周杰伦歌曲MV 154部 01/
  016.周杰伦歌曲MV 154部 02/
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
          - /home/x/code/openktv/app/media/nas_hdd/016.周杰伦歌曲MV 154部 01
          - /home/x/code/openktv/app/media/nas_hdd/016.周杰伦歌曲MV 154部 02
          - /home/x/code/openktv/app/media/nas_hdd
```

This makes repository media downloads land on the NAS and makes playback resolve local files from the same NAS-backed folders.
