import type { Metadata } from 'next';
import PricingClient from './PricingClient';

export const metadata: Metadata = {
  title: '套餐定价 - 证件照裁剪工具',
  description: '选择适合你的套餐，免费注册即送 3 次 AI 抠图额度',
};

export default function PricingPage() {
  return <PricingClient />;
}
