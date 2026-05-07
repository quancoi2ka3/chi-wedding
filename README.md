# Thiep Cuoi Online

Website thiep cuoi online hien dai cho:

- Co dau: Pham Lan Chi
- Chu re: Nguyen Manh Quan

## Tinh nang hien co

- Man hinh Mo thiep + hieu ung hoa bay nhe
- Hoa roi nen xuyen suot trang
- Dem nguoc ngay cuoi theo thoi gian thuc
- Lich trinh le cuoi + mo Google Maps
- Nut Toi se tham gia chuyen den form RSVP
- Form RSVP luu local + ho tro webhook
- Gui loi chuc va hien thi danh sach loi chuc
- Album anh + lightbox
- Upload anh cuoi bo sung vao album
- Hop mung cuoi co ma QR + sao chep STK
- Them vao Google Calendar
- Chia se link thiệp
- Auto scroll tu tren xuong duoi toc do cham

## Nhac nen My Love

Da cau hinh san duong dan:

assets/music/my-love-westlife.mp3

Ban can dat file mp3 co quyen su dung vao dung duong dan tren.

## Thu muc anh cuoi

Dat anh cuoi tai:

assets/images/wedding/

Sau do sua src cua anh trong index.html de moi khach mo link deu xem duoc anh that cua ban.

## Chay local

1. Cai Node.js
2. Chay lenh:

```bash
npx serve .
```

3. Mo link local do terminal tra ve.

## Deploy share link

Ban co the deploy len Netlify, Vercel hoac GitHub Pages.

## Day len GitHub

### Cach nhanh bang command line

```bash
git init
git add .
git commit -m "Initial wedding invitation site"
git branch -M main
git remote add origin <GITHUB_REPO_URL>
git push -u origin main
```

### Neu chua co repo

1. Tao repo moi tren GitHub
2. Copy URL repo
3. Chay lenh o tren voi URL vua copy

## Luu y ve du lieu RSVP/loi chuc

Ban dang luu local tren tung trinh duyet. Neu muon dong bo cho tat ca khach moi, hay cau hinh rsvpWebhookUrl trong script.js den backend hoac Google Apps Script Web App.
