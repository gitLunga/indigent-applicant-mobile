import React from 'react';
import { colors } from '../theme';

/**
 * The icon set.
 *
 * The web client draws its icons by hand in `ui/Icon.jsx` — about forty paths on
 * a 24px grid at 2px stroke, which is Feather's geometry. Lucide is Feather's
 * maintained successor with the same grid and the same stroke, so the two front
 * ends keep drawing the same shapes while this one gets the fifteen hundred
 * icons the hand-rolled set does not have.
 *
 * **Names are the web's, not Lucide's.** `dashboard`, `applications`, `file`,
 * `logout` are the vocabulary `Icon.jsx` established, and call sites here use
 * them unchanged. That is the point of this wrapper: when somebody adds an icon
 * to the sidebar on the web and mirrors it here, they write the same string in
 * both places. Lucide's own names (`LayoutDashboard`, `LogOut`) stay behind this
 * file, where a rename in a future major version is one line to fix instead of
 * forty call sites.
 *
 * Icons are deep-imported one file at a time rather than pulled from the barrel.
 * `import { X } from 'lucide-react-native'` makes Metro bundle all ~1500 icons;
 * on a data-metered phone that is a lot of JavaScript to ship for the twenty
 * shapes this app draws.
 */

import AlertCircle from 'lucide-react-native/icons/circle-alert';
import AlertTriangle from 'lucide-react-native/icons/triangle-alert';
import Applications from 'lucide-react-native/icons/files';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Banknote from 'lucide-react-native/icons/banknote';
import Bell from 'lucide-react-native/icons/bell';
import Calendar from 'lucide-react-native/icons/calendar';
import Camera from 'lucide-react-native/icons/camera';
import Check from 'lucide-react-native/icons/check';
import CheckCircle from 'lucide-react-native/icons/circle-check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import Close from 'lucide-react-native/icons/x';
import Dashboard from 'lucide-react-native/icons/layout-dashboard';
import Edit from 'lucide-react-native/icons/file-pen-line';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import File from 'lucide-react-native/icons/file';
import FileCheck from 'lucide-react-native/icons/file-check';
import FileText from 'lucide-react-native/icons/file-text';
import Help from 'lucide-react-native/icons/circle-question-mark';
import Home from 'lucide-react-native/icons/house';
import Image from 'lucide-react-native/icons/image';
import Info from 'lucide-react-native/icons/info';
import KeyRound from 'lucide-react-native/icons/key-round';
import Lock from 'lucide-react-native/icons/lock';
import Logout from 'lucide-react-native/icons/log-out';
import Mail from 'lucide-react-native/icons/mail';
import MapPin from 'lucide-react-native/icons/map-pin';
import Menu from 'lucide-react-native/icons/menu';
import Paperclip from 'lucide-react-native/icons/paperclip';
import Phone from 'lucide-react-native/icons/phone';
import Plus from 'lucide-react-native/icons/plus';
import Refresh from 'lucide-react-native/icons/refresh-cw';
import Search from 'lucide-react-native/icons/search';
import Send from 'lucide-react-native/icons/send';
import Shield from 'lucide-react-native/icons/shield-check';
import Trash from 'lucide-react-native/icons/trash-2';
import Upload from 'lucide-react-native/icons/cloud-upload';
import User from 'lucide-react-native/icons/user-round';

const ICONS = {
  // Navigation — these names match the web sidebar's `link.icon` values.
  dashboard: Dashboard,
  applications: Applications,
  edit: Edit,
  file: File,
  bell: Bell,
  user: User,
  shield: Shield,
  help: Help,
  logout: Logout,
  home: Home,

  // Actions
  upload: Upload,
  camera: Camera,
  image: Image,
  search: Search,
  plus: Plus,
  trash: Trash,
  refresh: Refresh,
  send: Send,
  paperclip: Paperclip,
  eye: Eye,
  'eye-off': EyeOff,
  lock: Lock,
  key: KeyRound,

  // State
  check: Check,
  'check-circle': CheckCircle,
  'file-check': FileCheck,
  'file-text': FileText,
  'alert-circle': AlertCircle,
  'alert-triangle': AlertTriangle,
  info: Info,

  // Chrome
  menu: Menu,
  close: Close,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,

  // Detail
  calendar: Calendar,
  phone: Phone,
  mail: Mail,
  'map-pin': MapPin,
  money: Banknote,
} as const;

export type IconName = keyof typeof ICONS;

export default function Icon({
  name,
  size = 18,
  color = colors.inkSoft,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  /**
   * 2 matches the web's hand-drawn paths. Larger display icons look heavy at 2,
   * so the landing cards and empty states drop to 1.75 — the same trick the
   * stroke-based icon sets use at size.
   */
  strokeWidth?: number;
}) {
  const Glyph = ICONS[name];
  return <Glyph size={size} color={color} strokeWidth={strokeWidth} />;
}
