# Button Styles Report

This file lists button-related CSS rules found across the project and the main properties (height / min-width / padding / font-size / background / color / notes).

| File | Selector | Height | Min-width | Padding | Font-size | Background | Color | Notes |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| static/common.scss | `button, .btn, .pager-btn, .pager-btn > *, .btn-text` | (none) | (none) | (none) | (none) | (none) | (none) | Generic rule: display:inline-flex; align-items:center; justify-content:center; sets centering only |
| static/common.scss | `.pager-btn` | `min-height: 72rpx` | `min-width: 220rpx` | `16rpx 36rpx` | (none on root); `.btn-text` set to 28rpx | (per-page) often gradient `linear-gradient(90deg,#409EFF,#66B1FF)` when `.primary` | varies | Global pager sizing (recent patch) — overrides page-level smaller sizes |
| uni.scss | `.btn-save` | `60rpx` | (none) | `0 40rpx` | `26rpx` | `#409EFF` | `#fff` | Global save button (box-shadow present)
| components/ItemQuery.vue | `.search-btn` / `.more-btn` | `60rpx` | `105rpx` (width) | `0 16rpx` | `20rpx` | `linear-gradient(90deg,#409EFF,#66B1FF)` | `#fff` | Query bar buttons
| components/ItemQuery.vue | `.pager-btn` (component) | (none explicit) (was `padding:10rpx 18rpx`) | (none) | `10rpx 18rpx` | `28rpx` (`.btn-text`) | `#fff` default; `.primary` → gradient | depends | Page-scoped pager rules; global override increases size
| components/ItemQuery.vue | `.more-actions .btn` | `56rpx` | `min-width:120rpx` | `0 18rpx` | `20rpx` | `#fff` | `#333` | Drawer action buttons
| components/DateRangePicker.vue | `.btn` | `44rpx` | (none) | `8rpx 18rpx` | (inherit/default) | `#fff` | (default) | Modal small buttons; `.btn.primary` uses gradient
| pages/profile/index.vue | `.btn` | (none fixed) | (none) | `14rpx 28rpx` | `30rpx` | `.btn.save`: `#007AFF`; `.btn.cancel`: `#fff` | saves: `#fff` | Profile page buttons (larger font)
| pages/parcel-incoming/item-entry.vue` & similar | `.action-btns .btn` | `60rpx` | (flex) | `0 40rpx` | `26rpx` | `.btn-primary` `#409EFF` or other page colors | `#fff` | Common bottom action bar buttons across parcel pages
| pages/parcel-leaving/index.vue | `.dialog-actions .btn` | `64rpx` | (none) | (none) | `24rpx` | `.btn-cancel` `#E6A23C`; `.btn-primary` `#67C23A` | `#fff` | Dialog action buttons with specific colors
| pages/account/payables.vue | `.drawer-footer .btn` | `56rpx` | `min-width:120rpx` | `0 18rpx` | `20rpx` | `#fff` (default) | `#333` | Drawer footer style
| pages/home/index.vue | `.logout-btn` | (auto) | (none) | `6rpx 11rpx` | `10px` | `transparent` | `#fff` | Small logout control — styled as link/button
| many pages | `.btn` (page-local) | varies (44rpx / 56rpx / 60rpx) | varies | varies | varies (20rpx — 30rpx) | varies (#fff or gradients or themed colors) | varies | Page-scoped `.btn` overrides are common — local values take precedence over global centering rules

---

Notes & recommendations

- There are many page-scoped `.btn` definitions. For consistency it is recommended to extract a few global utility classes (e.g., `.btn`, `.btn--lg`, `.btn--md`, `.btn--sm`, `.btn--primary`) in `static/common.scss` or `uni.scss` and migrate page usages to those classes.
- Pager buttons were enlarged globally to avoid clipping; you may reduce min-width and font-size if you prefer smaller footprint on narrow screens.

If you want this exported as CSV or a JSON file instead, tell me which format and I'll generate it. If you'd like me to also scan for icon/button sizing inside components (svg widths/heights) I can include that as well.
