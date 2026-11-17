import {
  IconBolt,
  IconCar,
  IconCertificate,
  IconCoins,
  IconDroplet,
  IconFileText,
  IconGavel,
  IconHeart,
  IconHome,
  IconReceipt2,
  IconTool,
  IconWallet,
  type IconProps,
} from "@tabler/icons-react"

const ICONS: Record<string, React.ComponentType<IconProps>> = {
  passport: IconFileText,
  certificate: IconCertificate,
  gavel: IconGavel,
  tax: IconReceipt2,
  car: IconCar,
  tool: IconTool,
  droplet: IconDroplet,
  bolt: IconBolt,
  heart: IconHeart,
  home: IconHome,
  coins: IconCoins,
  wallet: IconWallet,
}

export function ServiceIcon({
  icon,
  size = 22,
  className,
}: {
  icon: string
  size?: number
  className?: string
}) {
  const Icon = ICONS[icon] ?? IconFileText
  return <Icon size={size} stroke={1.6} className={className} aria-hidden="true" />
}
