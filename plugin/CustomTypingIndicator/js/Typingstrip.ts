import { useEffect, useRef } from 'react'
import { Animated, Image, View } from 'react-native'
import type { TypingEntry } from '../data'

const SIZE = 18

function Emoji({ uri, index, animation }: { uri: string; index: number; animation: TypingEntry['animation'] }) {
	const v = useRef(new Animated.Value(0)).current

	useEffect(() => {
		if (animation === 'none') return
		// Stagger each emoji so "wave" actually ripples left to right.
		const loop = Animated.loop(
			Animated.sequence([
				Animated.delay(index * 120),
				Animated.timing(v, { toValue: 1, duration: 350, useNativeDriver: true }),
				Animated.timing(v, { toValue: 0, duration: 350, useNativeDriver: true }),
				Animated.delay(400),
			]),
		)
		loop.start()
		return () => loop.stop()
	}, [animation, index, v])

	const style =
		animation === 'pulse'
			? { transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }] }
			: animation === 'none'
				? {}
				: {
						transform: [
							{
								translateY: v.interpolate({
									inputRange: [0, 1],
									outputRange: [0, animation === 'bounce' ? -6 : -3],
								}),
							},
						],
					}

	return (
		<Animated.View style={style}>
			<Image source={{ uri }} style={{ width: SIZE, height: SIZE, marginRight: 3 }} />
		</Animated.View>
	)
}

export default function TypingStrip({ entry }: { entry: TypingEntry }) {
	if (!entry.emojis.length) return null
	return (
		<View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 4 }}>
			{entry.emojis.map((uri, i) => (
				<Emoji key={`${i}:${uri}`} uri={uri} index={i} animation={entry.animation} />
			))}
		</View>
	)
      }
