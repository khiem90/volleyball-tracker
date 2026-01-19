// ============================================
// HEROICONS MAPPING
// Centralized icon exports - migrating from Lucide to HeroIcons
// ============================================

// Outline icons (24x24)
export {
  HomeIcon,
  UserGroupIcon,
  BoltIcon,
  TrophyIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  MinusIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  TrashIcon,
  PencilSquareIcon,
  CalendarIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  EyeIcon,
  EyeSlashIcon,
  ShareIcon,
  ClipboardIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  ArrowTopRightOnSquareIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ArrowUturnLeftIcon,
  SparklesIcon,
  StarIcon,
  Cog6ToothIcon,
  EllipsisVerticalIcon,
  EllipsisHorizontalIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  CheckIcon,
  Square3Stack3DIcon,
  Squares2X2Icon,
  RectangleStackIcon,
  ListBulletIcon,
  LinkIcon,
  GlobeAltIcon,
  LockClosedIcon,
  LockOpenIcon,
  ShieldCheckIcon,
  UserIcon,
  UserPlusIcon,
  UsersIcon,
  CursorArrowRaysIcon,
  HandRaisedIcon,
  FireIcon,
  HeartIcon,
  FlagIcon,
  HashtagIcon,
  TagIcon,
  PhotoIcon,
  PaintBrushIcon,
  SwatchIcon,
  AdjustmentsHorizontalIcon,
  FunnelIcon,
  DocumentIcon,
  DocumentTextIcon,
  DocumentDuplicateIcon,
  FolderIcon,
  ArchiveBoxIcon,
  InboxIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftIcon,
  ChatBubbleOvalLeftIcon,
  BellIcon,
  BellAlertIcon,
  SignalIcon,
  WifiIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  CpuChipIcon,
  CircleStackIcon,
  CloudIcon,
  ServerIcon,
  CommandLineIcon,
  CodeBracketIcon,
  CubeIcon,
  CubeTransparentIcon,
  PresentationChartLineIcon,
  PresentationChartBarIcon,
  ChartBarIcon,
  ChartPieIcon,
  TableCellsIcon,
  CalculatorIcon,
  CalendarDaysIcon,
  MapIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  HomeModernIcon,
  SunIcon,
  MoonIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  PrinterIcon,
  QrCodeIcon,
  FingerPrintIcon,
  KeyIcon,
  WrenchIcon,
  WrenchScrewdriverIcon,
  ScissorsIcon,
  BookmarkIcon,
  BookOpenIcon,
  AcademicCapIcon,
  GiftIcon,
  ShoppingCartIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ReceiptPercentIcon,
  TicketIcon,
  MusicalNoteIcon,
  FilmIcon,
  CameraIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  VideoCameraIcon,
  PhoneIcon,
  EnvelopeIcon,
  AtSymbolIcon,
  PaperClipIcon,
  NewspaperIcon,
  RssIcon,
  RadioIcon,
  TvIcon,
  RocketLaunchIcon,
  BeakerIcon,
  LightBulbIcon,
  BoltSlashIcon,
  Battery50Icon,
  Battery100Icon,
  SignalSlashIcon,
  NoSymbolIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";

// Solid icons (24x24)
export {
  HomeIcon as HomeSolid,
  UserGroupIcon as UserGroupSolid,
  BoltIcon as BoltSolid,
  TrophyIcon as TrophySolid,
  ClockIcon as ClockSolid,
  CheckCircleIcon as CheckCircleSolid,
  StarIcon as StarSolid,
  HeartIcon as HeartSolid,
  FireIcon as FireSolid,
  PlayIcon as PlaySolid,
  PauseIcon as PauseSolid,
  EyeIcon as EyeSolid,
  BellIcon as BellSolid,
  BookmarkIcon as BookmarkSolid,
  FlagIcon as FlagSolid,
  SparklesIcon as SparklesSolid,
} from "@heroicons/react/24/solid";

// Mini icons (20x20) - for smaller UI elements
export {
  HomeIcon as HomeMini,
  TrophyIcon as TrophyMini,
  UserGroupIcon as UserGroupMini,
  ChevronRightIcon as ChevronRightMini,
  ChevronLeftIcon as ChevronLeftMini,
  ChevronDownIcon as ChevronDownMini,
  CheckIcon as CheckMini,
  XMarkIcon as XMarkMini,
  PlusIcon as PlusMini,
  MinusIcon as MinusMini,
} from "@heroicons/react/20/solid";

// ============================================
// CUSTOM SVG ICONS (for icons HeroIcons lacks)
// ============================================

import React from "react";

// Bracket icon for tournament brackets
export const BracketIcon = React.memo(({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 4v4h4M4 8h4v8h4M4 20v-4h4M20 4v4h-4M20 8h-4v8h-4M20 20v-4h-4"
    />
  </svg>
));
BracketIcon.displayName = "BracketIcon";

// Double bracket icon for double elimination
export const DoubleBracketIcon = React.memo(({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 6v3h3M3 9h5v6h4M3 18v-3h3M21 6v3h-3M21 9h-5v6h-4M21 18v-3h-3M12 9v6"
    />
  </svg>
));
DoubleBracketIcon.displayName = "DoubleBracketIcon";

// Crown icon for winner/champion
export const CrownIcon = React.memo(({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 17.25h19.5M4.5 17.25V8.25l3.75 3 3.75-6 3.75 6 3.75-3v9"
    />
  </svg>
));
CrownIcon.displayName = "CrownIcon";

// Swords icon for versus/competition
export const SwordsIcon = React.memo(({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M18 6h-5M18 6v5M18 18L6 6M6 6h5M6 6v5"
    />
  </svg>
));
SwordsIcon.displayName = "SwordsIcon";

// Rotation icon for rotation-based formats
export const RotationIcon = React.memo(({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.678 48.678 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
    />
  </svg>
));
RotationIcon.displayName = "RotationIcon";

// VS icon for match display
export const VsIcon = React.memo(({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 6l4 12M8 6l-4 12M14 6v12M20 6v6c0 3-2 6-6 6"
    />
  </svg>
));
VsIcon.displayName = "VsIcon";

// ============================================
// LUCIDE TO HEROICONS MAPPING REFERENCE
// ============================================
// Lucide Icon       -> HeroIcons Replacement
// -----------------------------------------
// Home              -> HomeIcon
// Users             -> UserGroupIcon
// Zap               -> BoltIcon
// Trophy            -> TrophyIcon
// Clock, History    -> ClockIcon
// Check, CheckCircle2 -> CheckCircleIcon
// Plus              -> PlusIcon
// Minus             -> MinusIcon
// ArrowRight        -> ArrowRightIcon
// ArrowLeft         -> ArrowLeftIcon
// Trash2            -> TrashIcon
// Pencil            -> PencilSquareIcon
// Calendar          -> CalendarIcon
// ChevronRight      -> ChevronRightIcon
// Search            -> MagnifyingGlassIcon
// Menu              -> Bars3Icon
// X                 -> XMarkIcon
// LogIn             -> ArrowRightOnRectangleIcon
// LogOut            -> ArrowLeftOnRectangleIcon
// Play              -> PlayIcon
// Eye               -> EyeIcon
// Maximize2         -> ArrowsPointingOutIcon
// Minimize2         -> ArrowsPointingInIcon
// Undo2             -> ArrowUturnLeftIcon
// Shuffle           -> ArrowsRightLeftIcon
// RefreshCw         -> ArrowPathIcon
// RotateCw          -> ArrowPathIcon (or RotationIcon custom)
// Crown             -> CrownIcon (custom) or StarIcon
// Share2            -> ShareIcon
// Copy              -> ClipboardIcon
// MoreVertical      -> EllipsisVerticalIcon
// ExternalLink      -> ArrowTopRightOnSquareIcon
// Loader2           -> Use CSS animation or ArrowPathIcon with animate-spin
// Brackets          -> BracketIcon (custom)
// Layers            -> Square3Stack3DIcon
// Sparkles          -> SparklesIcon
// Settings          -> Cog6ToothIcon
// Info              -> InformationCircleIcon
// AlertCircle       -> ExclamationCircleIcon
// AlertTriangle     -> ExclamationTriangleIcon
// Swords            -> SwordsIcon (custom)
