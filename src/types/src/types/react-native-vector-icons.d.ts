declare module 'react-native-vector-icons/Ionicons' {
  import type React from 'react';
  import type { TextProps } from 'react-native';

  interface IoniconsProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  const Ionicons: React.ComponentType<IoniconsProps>;
  export default Ionicons;
}