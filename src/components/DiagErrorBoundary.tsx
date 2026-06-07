import React from 'react';
import { View, Text, ScrollView } from 'react-native';

/**
 * 진단용 에러 바운더리 — 렌더/라이프사이클에서 throw된 에러를 잡아
 * 앱 크래시 대신 화면에 에러 내용(name/message/stack/컴포넌트)을 표시한다.
 * try/catch가 못 잡는 렌더 크래시 진단용. (구글 로그인 후 크래시 원인 추적)
 */
type State = { error: Error | null; stack: string };

export default class DiagErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, stack: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    this.setState({ error, stack: info?.componentStack || '' });
  }

  render() {
    const { error, stack } = this.state;
    if (!error) return this.props.children;
    const body =
      `🔍 렌더 크래시 (진단)\n\n` +
      `name=${error.name}\n` +
      `message=${error.message}\n\n` +
      `[stack]\n${String(error.stack || '').slice(0, 1500)}\n\n` +
      `[component]\n${stack.slice(0, 1000)}`;
    return (
      <View style={{ flex: 1, backgroundColor: '#0E1116', paddingTop: 64, paddingHorizontal: 16 }}>
        <ScrollView>
          <Text selectable style={{ color: '#FF6B6B', fontSize: 13, lineHeight: 19, fontWeight: '600' }}>
            {body}
          </Text>
        </ScrollView>
      </View>
    );
  }
}
