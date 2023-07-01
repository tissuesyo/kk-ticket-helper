# kk-ticket-helper

Chrome Extension 實作練習，目前支援三種購票網站

- KKITX
- 拓 money
- iBom

## 待補功能

1. [KKTIX] 相同票價目前只會選第一個找到的，可以在加上區域的關鍵字
2. [KKTIX] 需要 reCAPTCHA 圖形驗證的情境下，按下 [下一步] 按鈕 timing

- 這段有點妙... 目前先用很爛的解法 笑歪
- 如果發現需要圖形驗證，會在每隔 500 ms 按按鈕
- 以及網頁 load event 之後再 trigger 一次

3. [All] 剩餘票數 < 欲購票數的情境

- 看是區域比較重要，犧牲其他迷妹小夥伴
- 還是換有符合數量的區域來購買

4. [ALL] 跳過信仰值問題、圖形驗證

- 如果知道問到的答案，透過 background script 更新 shorage

5. Code 還太醜，要 refactor
