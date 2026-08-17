# Kaisa Kids Icons

독창적인 귀여운 SVG 아이콘을 **ID**로 관리합니다. 이모지 문자를 쓰지 않습니다.

## 사용법

```tsx
import {KidsIcon} from '@/components/kids-icon';

<KidsIcon id="animal-cat" size={64} />
```

## 새 아이콘 추가

1. `src/assets/kids-icons/` 아래 적절한 파일에 SVG 컴포넌트 추가
2. `registry.ts`의 `KidsIconId`와 `KIDS_ICON_REGISTRY`에 등록
3. 게임에서는 `id`만 참조

## 카테고리

- `animal-*` 동물
- `fruit-*` 과일
- `shape-*` 도형
- `color-*` 색깔 방울
- `item-*` UI·소품
- `monster-*` 모험 몬스터
