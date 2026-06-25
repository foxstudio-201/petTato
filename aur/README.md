# petTaTo on Arch Linux (AUR)

`pettato-bin` repackages the official release `.deb` into a native Arch package,
so it installs like any other AUR app on Arch / CachyOS / Manjaro / EndeavourOS.

## Install it now (local, no AUR account needed)

```bash
cd aur
makepkg -si      # builds and installs via pacman
```

Then launch **petTaTo** from your app menu, or run `pettato` in a terminal.

## Publish to the AUR so everyone can `yay -S pettato-bin`

You need an [AUR account](https://aur.archlinux.org) with your SSH public key added
(Account → My Account → SSH Public Key).

```bash
git clone ssh://aur@aur.archlinux.org/pettato-bin.git
cp PKGBUILD .SRCINFO pettato-bin/
cd pettato-bin
git add PKGBUILD .SRCINFO
git commit -m "pettato-bin 1.0.0"
git push
```

After that, anyone can install with their AUR helper:

```bash
yay -S pettato-bin      # or: paru -S pettato-bin
```

## Updating for a new release

Bump `pkgver` in `PKGBUILD`, refresh the checksum, regenerate `.SRCINFO`, push:

```bash
updpkgsums                       # rewrites sha256sums for the new .deb
makepkg --printsrcinfo > .SRCINFO
git commit -am "pettato-bin <new-version>" && git push
```
