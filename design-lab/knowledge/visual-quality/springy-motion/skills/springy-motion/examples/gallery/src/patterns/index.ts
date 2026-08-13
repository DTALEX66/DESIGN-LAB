import type { FC } from 'react'
import { HoldToConfirm } from './HoldToConfirm'
import { SubmitButton } from './SubmitButton'
import { LikeButton } from './LikeButton'
import { SpringToggle } from './SpringToggle'
import { ThemeSwitch } from './ThemeSwitch'
import { DrawCheckbox } from './DrawCheckbox'
import { Paywall } from './Paywall'
import { PushNotification } from './PushNotification'
import { WalletStack } from './WalletStack'
import { SendFlow } from './SendFlow'
import { DynamicIsland } from './DynamicIsland'
import { MorphFab } from './MorphFab'
import { ProximityDock } from './ProximityDock'
import { ProximityCompare } from './ProximityCompare'
import { AnimateHierarchy } from './AnimateHierarchy'
import { GrowTextarea } from './GrowTextarea'

type Card = { title: string; note: string; Comp: FC }

export const PATTERNS: Card[] = [
  { title: 'Hold to confirm', note: 'linear fill → Pop ✓ · destructive commits on completion', Comp: HoldToConfirm },
  { title: 'Submit → success', note: 'layout width-morph · spinner → Pop check', Comp: SubmitButton },
  { title: 'Like + burst', note: 'Lively heart · particle burst · tabular counter', Comp: LikeButton },
  { title: 'Springy toggle', note: 'Snap slide + squash & stretch knob', Comp: SpringToggle },
  { title: 'Theme switch', note: 'sun ⇄ moon morph (Pop)', Comp: ThemeSwitch },
  { title: 'Draw-in checkbox', note: 'SVG path draws in + Pop fill', Comp: DrawCheckbox },
  { title: 'Paywall', note: 'price ticker · save badge · plan select · CTA', Comp: Paywall },
  { title: 'Push notification', note: 'spring-in · stagger · swipe-dismiss · tap-expand', Comp: PushNotification },
  { title: 'Morph FAB → actions', note: 'blur-masked morph · scale-to-dot · pills deblur + spread', Comp: MorphFab },
  { title: 'Animate the hierarchy', note: 'cards stagger in, then text — not one block (toggle to compare)', Comp: AnimateHierarchy },
  { title: 'Grow with content', note: 'field-sizing: content — no nested scroll', Comp: GrowTextarea },
]

export const SHOWCASE: Card[] = [
  { title: 'Proximity vs direct', note: 'distance gradient (neighbors respond) vs only-hovered · Slow Motion toggle', Comp: ProximityCompare },
  { title: 'Proximity dock', note: 'magnify by cursor distance · one hover-scale · nearest labelled', Comp: ProximityDock },
  { title: 'Dynamic Island', note: 'shape-morph pill · live equalizer · countdown ring · tap-to-expand player', Comp: DynamicIsland },
  { title: 'Wallet stack', note: 'stacked → fan-out · drag rubber-band · shared-element detail', Comp: WalletStack },
  { title: 'Send flow', note: 'box springs to hug content · value carries · Con→firm morph · success', Comp: SendFlow },
]
