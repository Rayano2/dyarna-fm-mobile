import { Image } from 'react-native';

const LOGO = require('../../../assets/logo.png');

type LogoProps = {
  size?: number;
};

export function Logo({ size = 160 }: LogoProps) {
  return <Image source={LOGO} style={{ width: size, height: size }} resizeMode="contain" />;
}
