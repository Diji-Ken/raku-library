import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5176/';

async function openDocumentModal(page) {
  await page.goto(BASE_URL);
  // まず「UI設計書」をクリックしてモーダルを開く（存在しない場合は最初のカードをクリック）
  const uiDocTitle = page.locator('.document-card .document-title', { hasText: 'UI設計書' });
  if (await uiDocTitle.count()) {
    await uiDocTitle.first().click();
  } else {
    await page.locator('.document-card').first().click();
  }
  await expect(page.getByTitle('閉じる (ESC)')).toBeVisible();
}

function pageCounterLocator(page) {
  return page.locator('div').filter({ hasText: /\d+\s\/\s\d+/ }).first();
}

function parseCounter(text) {
  const m = text.match(/(\d+)\s\/\s(\d+)/);
  if (!m) return null;
  return { current: Number(m[1]), total: Number(m[2]) };
}

// モーダルが開き、背景クリックで閉じることを確認
test('モーダル背景クリックで閉じる', async ({ page }) => {
  await openDocumentModal(page);
  // 背景（オーバーレイ）の左上付近をクリックして閉じる（クリックゾーンの top-16 よりも上）
  const overlay = page.getByTestId('modal-overlay');
  await overlay.click({ position: { x: 10, y: 10 } });
  await expect(page.getByTitle('閉じる (ESC)')).toBeHidden();
});

// クリックゾーン（右）でページが進み、（左）で戻ることを確認
test('左右クリックゾーンでページ移動', async ({ page }) => {
  await openDocumentModal(page);
  const counter = pageCounterLocator(page);
  const initialText = await counter.textContent();
  const before = parseCounter(initialText || '');
  if (!before) throw new Error('ページカウンタの解析に失敗しました');

  // 右クリックゾーンで次のページへ（透明要素のためclickではなくdispatchEventで直接発火）
  const nextZone = page.getByTestId('clickzone-next');
  if (before.total > 1) {
    await nextZone.dispatchEvent('click');
    const afterText = await counter.textContent();
    const after = parseCounter(afterText || '');
    if (!after) throw new Error('ページカウンタの解析に失敗しました (after)');
    expect(after.current).toBe(before.current + 1);

    // 左クリックゾーンで前のページへ戻る（同様にdispatchEventで直接発火）
    const prevZone = page.getByTestId('clickzone-prev');
    await prevZone.dispatchEvent('click');
    const backText = await counter.textContent();
    const back = parseCounter(backText || '');
    if (!back) throw new Error('ページカウンタの解析に失敗しました (back)');
    expect(back.current).toBe(before.current);
  }
});

// 閉じるボタンで確実に閉じることを確認
test('閉じるボタンでモーダルを閉じる', async ({ page }) => {
  await openDocumentModal(page);
  await page.getByTitle('閉じる (ESC)').click();
  await expect(page.getByTitle('閉じる (ESC)')).toBeHidden();
});