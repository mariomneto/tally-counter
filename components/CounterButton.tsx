import React from 'react';
import { ColorValue, Dimensions, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import AnimateableText from 'react-native-animateable-text';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolateColor, runOnJS, useAnimatedProps, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Haptics from "react-native-haptic-feedback";

const { width } = Dimensions.get('screen');
const size = width * 0.1;

interface CounterButtonProps {
    text: string;
    style: ViewStyle;
    onTap: () => void;
}

const CounterButton: React.FC<CounterButtonProps> = ({ text, style, onTap }: CounterButtonProps) => {
    const buttonOpacity = useSharedValue(0);
    const animatedTextProps = useAnimatedProps(() => ({ text }));

    const onEndTap = () => {
        'worklet';
        buttonOpacity.value = withSpring(0, { stiffness: 60, overshootClamping: true });
    }

    const triggerHaptics = () => {
        const options = {
            enableVibrateFallback: true,
            ignoreAndroidSystemSettings: false
          };
        Haptics.trigger("textHandleMove", options);
    }

    const tapGesture = Gesture.Tap()
        .maxDuration(10000)
        .onBegin(() => {
            buttonOpacity.value = 1;
            onTap();
            runOnJS(triggerHaptics)();
        })
        .onEnd(onEndTap)
        .onTouchesCancelled(onEndTap)
        .onFinalize(onEndTap)
    
    const rButtonStyle = useAnimatedStyle(() => {
        return {
            opacity: buttonOpacity.value
        }
    });
    
    const rTextStyle = useAnimatedStyle(() => {
        const inputRange = [1, 0];
        const outputColorRange = [colors.buttonContrast, colors.button];
        const color = interpolateColor(buttonOpacity.value, inputRange, outputColorRange) as ColorValue;

        return { color }
    });

    return (      
        <GestureDetector gesture={tapGesture}>
            <Animated.View style={[style, styles.container]}>
                <Animated.View style={[styles.button, rButtonStyle]}/>
                <AnimateableText animatedProps={animatedTextProps} style={[styles.indicatorText, rTextStyle]}/>
            </Animated.View>
        </GestureDetector>
  )
}

const colors = {
    button: '#888',
    buttonContrast: 'black'
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    } as ViewStyle,
    button: {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.button,
    },
    indicatorText: {
        position: 'absolute',
        bottom: size * 0.07,
        fontSize: 35,
        color: 'white',
        opacity: 0.4
      } as TextStyle
})

export default CounterButton