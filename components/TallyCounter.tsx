import React from 'react';
import { Dimensions, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import AnimateableText from 'react-native-animateable-text';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, Extrapolate, interpolate, runOnJS, useAnimatedProps, useAnimatedReaction, useAnimatedStyle, useDerivedValue, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { between, clamp } from 'react-native-redash';
import Haptics from "react-native-haptic-feedback";
import CounterButton from './CounterButton';

const { width } = Dimensions.get('window');
const counterWidth = width * 0.43;
const counterHeight = counterWidth * 0.44;
const circleSize = counterHeight * 0.75;
const countTolerance = 20;
const xyOffset = 5;
const maxHorizontal = counterWidth * 0.45 - circleSize / 2;
const maxVertical = counterHeight * 0.85;
const initialAcceleration = 1500;
const finalAcceleration = 100;
const timeToAccelerate = 1800;

type SliderContext = 'horizontal' | 'vertical' | 'undefined';
type Acceleration = 'off' | 'positive' | 'negative';

interface TallyCounterProps {
  onCount?: (n: number) => void;
}

const TallyCounter: React.FC<TallyCounterProps> = ({ onCount }: TallyCounterProps) => {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const counter = useSharedValue(0);
  const counterContext = useSharedValue(0);
  const counterText = useDerivedValue(() => `${counter.value}`);
  const indicatorOpacity = useSharedValue(1);
  const resetIndicatorOpacity = useDerivedValue(() => (1 - indicatorOpacity.value));
  const plusIndicatorOpacity = useSharedValue(1);
  const minusIndicatorOpacity = useSharedValue(1);
  const fontSize = useSharedValue(1);
  const sliderContext = useSharedValue<SliderContext>('undefined');
  const acc = useSharedValue<Acceleration>('off');
  const accelerating = useDerivedValue(() => (acc.value !== 'off'));
  const accelerationVelocity = useSharedValue(initialAcceleration);
  const currMoment = useSharedValue(0);

  const triggerHaptics = () => {
    const options = {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false
      };
    Haptics.trigger("impactLight", options);
  }

  useAnimatedReaction(() => {
    return {
      accelerating: accelerating.value,
      direction: acc.value,
      canAdd: currMoment.value >= 1
    };
  },({ canAdd, direction, accelerating }) => {
    'worklet';
    if(accelerating){
      if(accelerationVelocity.value !== finalAcceleration) {
        accelerationVelocity.value = withTiming(finalAcceleration, { duration: timeToAccelerate, easing: Easing.linear });
      }
      currMoment.value = withTiming(1, {duration: accelerationVelocity.value});
    }
    if(canAdd && accelerating){
      const addValue = direction === 'positive' ? 1 : -1;
      counterContext.value = counter.value = counter.value + addValue;
      currMoment.value = 0;
      fontSize.value = withSequence(withSpring(1.1, { stiffness: 800 }), withSpring(1, { stiffness: 800 }));
      runOnJS(triggerHaptics)();
      if(onCount) {
        runOnJS(onCount)(counter.value);
      }
    }
  }, [acc, currMoment, counter]);

  const countUp = () => {
    'worklet';
    counter.value = counterContext.value = counter.value + 1;
    const scale = counter.value > 9 ? 1.08 : 1.07;
    const stiffness = 600;
    fontSize.value = withSequence(withSpring(scale, { stiffness }), withSpring(1, { stiffness }));
    onCount ? runOnJS(onCount)(counter.value) : null;
  };

  const countDown = () => {
    'worklet';
    counter.value = counterContext.value = counter.value - 1;
    const scale = counter.value > 9 ? 1.08 : 1.07;
    const stiffness = 600;
    fontSize.value = withSequence(withSpring(scale, { stiffness }), withSpring(1, { stiffness }));
    onCount ? runOnJS(onCount)(counter.value) : null;
  };

  const resetAcceleration = () => {
    'worklet';
    acc.value = 'off';
    accelerationVelocity.value = initialAcceleration;
    currMoment.value = 0;
  }

  const onFinishPan = () => {
    'worklet';
    counter.value = Math.ceil(counter.value);
    counterContext.value = counter.value;
    scale.value = withSpring(1);
    sliderContext.value = 'undefined';
    tx.value = withSpring(0);
    ty.value = withSpring(0);
    indicatorOpacity.value = withSpring(1);
    plusIndicatorOpacity.value = withSpring(1);
    minusIndicatorOpacity.value = withSpring(1);
    resetAcceleration();
  }

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      sliderContext.value = 'undefined';
    })
    .onUpdate((event) => {
      if (sliderContext.value === 'undefined') {
        if(Math.abs(event.translationX) > xyOffset) {
            sliderContext.value = 'horizontal';
        }
        if(event.translationY > xyOffset && sliderContext.value !== 'horizontal') {
            sliderContext.value = 'vertical';
        }
      }
      switch (sliderContext.value) {
        case 'horizontal': {
          tx.value = clamp(event.translationX, -maxHorizontal, maxHorizontal);

          const minus = { input: [-maxHorizontal, 0, maxHorizontal], output: [1, 1, 0.2] }
          const plus = { input: [-maxHorizontal, 0, maxHorizontal], output: [0.2, 1, 1]}
          minusIndicatorOpacity.value = interpolate(tx.value, minus.input, minus.output, Extrapolate.CLAMP);
          plusIndicatorOpacity.value = interpolate(tx.value, plus.input, plus.output, Extrapolate.CLAMP);

          if(between(tx.value, -maxHorizontal, -maxHorizontal + countTolerance)){
            if(acc.value !== 'negative'){
              acc.value = 'negative';
              counter.value = counter.value - 1;
              scale.value = withSpring(1.25, { stiffness: 600 });
              runOnJS(triggerHaptics)();
            }
          }
          else if(between(tx.value, maxHorizontal - countTolerance, maxHorizontal)){
            if(acc.value !== 'positive'){
              acc.value = 'positive';
              counter.value = counter.value + 1;
              scale.value = withSpring(1.25, { stiffness: 600 });
              runOnJS(triggerHaptics)();
              onCount ? runOnJS(onCount)(counter.value) : null;
            }
          }
          else if(counter.value !== counterContext.value) {
            counter.value = counterContext.value;
            resetAcceleration();
            scale.value = withSpring(1.1, { stiffness: 600 });
            onCount ? runOnJS(onCount)(counter.value) : null;
          }
          else {
            resetAcceleration();
          }
          break;
        }
        case 'vertical': {
          tx.value = clamp(event.translationX, -30, 30);
          ty.value = clamp(event.translationY, 0, maxVertical);
          indicatorOpacity.value = interpolate(
            ty.value,
            [0, maxVertical],
            [1, 0]
          );
  
          if(between(ty.value, maxVertical - countTolerance, maxVertical)){
            if(counter.value != 0 && scale.value !== 2.5){
              counter.value = 0;
              scale.value = withSpring(1.25, { stiffness: 600 });
              runOnJS(triggerHaptics)();
            }
          }
          else if (counter.value === 0 && counter.value !== counterContext.value) {
            counter.value = counterContext.value;
          }
          break;
        }
      }
    })
    .onEnd(onFinishPan)
    .onTouchesCancelled(onFinishPan)
    .onFinalize(onFinishPan)

  const onFinishTap = () => {
    'worklet';
    scale.value = withSpring(1);
  }

  const tapGesture = Gesture.Tap()
    .maxDuration(100000)
    .onBegin(() => {
      scale.value = withSpring(1.1);
    })
    .onEnd(onFinishTap)
    .onTouchesCancelled(onFinishTap)
    .onFinalize(onFinishTap)

  const gesture = Gesture.Simultaneous(panGesture, tapGesture);
  
  const rIndicatorStyle = useAnimatedStyle(() => ({ opacity: indicatorOpacity.value }));
  
  const rPlusStyle = useAnimatedStyle(() => ({ opacity: plusIndicatorOpacity.value }));
  
  const rMinusStyle = useAnimatedStyle(() => ({ opacity: minusIndicatorOpacity.value }));
  
  const rResetStyle = useAnimatedStyle(() => ({ opacity: resetIndicatorOpacity.value }));
  
  const counterTextProps = useAnimatedProps(() => ({ text: counterText.value }));

  const rCircleStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: tx.value },
        { translateY: ty.value },
        { scale: scale.value }
      ]
    }
  });
  
  const rAnimatedText = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: fontSize.value }
      ]
    }
  });

  return (
      <View style={styles.container}>
        <CounterButton
          text={"-"}
          style={[styles.leftIndicator, rIndicatorStyle, rMinusStyle] as ViewStyle}
          onTap={countDown}
        />
        <CounterButton
          text={"+"}
          style={[styles.rightIndicator, rIndicatorStyle, rPlusStyle] as ViewStyle}
          onTap={countUp}
        />
        <Animated.View style={[styles.resetIndicator, rResetStyle]}>
          <Text style={[styles.indicatorText, { fontSize: 40 }]}>+</Text>
        </Animated.View>
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.circle, rCircleStyle]}>
            <AnimateableText animatedProps={counterTextProps} style={[styles.counter, rAnimatedText]}/>
          </Animated.View>
        </GestureDetector>
      </View>
  );
};


const colors = {
  background: '#222',
  circle: '#333'
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    width: counterWidth,
    height: counterHeight,
    borderRadius: counterHeight/ 2,
    backgroundColor: colors.background,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    overflow: 'visible',
    elevation: 7
  } as ViewStyle,
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
    width: circleSize,
    height: circleSize,
    borderRadius: circleSize / 2,
    backgroundColor: colors.circle,
  } as ViewStyle,
  counter: {
    fontSize: 25,
    fontWeight: 'bold',
    color: 'white',
    opacity: 0.6
  } as TextStyle,
  leftIndicator: {
    position: 'absolute',
    transform: [ { translateX: -counterWidth / 3 }]
  } as ViewStyle,
  rightIndicator: {
    position: 'absolute',
    transform: [{ translateX: counterWidth / 3 }]
  } as ViewStyle,
  resetIndicator: {
    position: 'absolute',
    transform: [{ rotate: '45deg' }]
  },
  indicatorText: {
    fontSize: 30,
    color: 'white',
    opacity: 0.4
  } as TextStyle
});

export default TallyCounter;