import type { Feature } from '../lib/feature'
import { badging } from './badging'
import { camera } from './camera'
import { checker } from './checker'
import { geolocation } from './geolocation'
import { motion } from './motion'
import { notification } from './notification'
import { passkey } from './passkey'
import { recorder } from './recorder'
import { share } from './share'
import { speech } from './speech'
import { storage } from './storage'
import { wakelock } from './wakelock'
import { webgpu } from './webgpu'

/** ホーム画面での表示順 */
export const features: Feature[] = [
  checker,
  geolocation,
  camera,
  recorder,
  motion,
  wakelock,
  notification,
  badging,
  share,
  passkey,
  speech,
  webgpu,
  storage,
]
