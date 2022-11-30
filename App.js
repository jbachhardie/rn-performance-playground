import { useState, useMemo, useCallback, memo } from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { NavigationContainer, useIsFocused } from "@react-navigation/native";
import { useEffect } from "react";
import { Button, View, Text, Animated, Easing, StyleSheet } from "react-native";
import MessageQueue from 'react-native/Libraries/BatchedBridge/MessageQueue';

if (__DEV__) {
  console.disableYellowBox = true
  const defaultLog = () => ({
    since: Date.now(),
    toJs: 0,
    toAndroid: 0,
  })
  let messagesSent = defaultLog()
  setInterval(() => {
    console.log('Bridge traffic in the past', (Date.now() - messagesSent.since) / 1000, 'seconds:')
    console.log('to JS:', messagesSent.toJs)
    console.log('to Android:', messagesSent.toAndroid)
    messagesSent = defaultLog()
  }, 10000)
  const logSpy = (info) => {
    const fromTo = info.type === 0 ? 'toJs' : 'toAndroid';
    messagesSent[fromTo]++
  };
  MessageQueue.spy(logSpy);
}

function slowFn(baseNumber) {
  let result = 0;
  for (var i = Math.pow(baseNumber, 7); i >= 0; i--) {
    result += Math.atan(i) * Math.tan(i);
  }
}

const DURATION = 3000;

function NativeTestView() {
  const hue = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(hue, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [hue]);
  const translateX = hue.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  return (
    <Animated.View
      style={{
        height: 100,
        width: 100,
        backgroundColor: "red",
        transform: [{ translateX }],
      }}
    >
      <Text>Native animation</Text>
    </Animated.View>
  );
}

function useTestView() {
  const [animated, setAnimated] = useState(0);
  const startTime = useMemo(() => Date.now(), []);
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimated(((Date.now() - startTime) / DURATION) % 1);
    }, 16.66);
    return () => clearInterval(interval);
  }, [setAnimated]);

  return {
    height: 100,
    width: 100,
    backgroundColor: "cyan",
    transform: [{ translateX: animated * 200 - 100 }],
  };
}

const viewStyle = StyleSheet.create({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  marginTop: 80,
});

function HomeScreen() {
  const testView = useTestView();

  return (
    <View style={viewStyle}>
      <View style={testView}>
        <Text>JS Render loop</Text>
      </View>
      <NativeTestView />
      <Text style={{ margin: 50 }}>
        The above squares updates at up to 60fps using React's render loop. The
        different screens of this app introduce various different patterns to
        see how they affect performance of that animation. The distance between
        the squares is proportional to the initial render lag, while jitteriness
        is proportional to the contention in the respective thread.
      </Text>
    </View>
  );
}

function SlowComponentScreen() {
  const testView = useTestView();
  slowFn(15);

  return (
    <View style={viewStyle}>
      <View style={testView}>
        <Text>JS Render loop</Text>
      </View>
      <NativeTestView />
      <Text style={{ margin: 50 }}>
        Here, the component body is doing something that requires a lot of CPU
        work, slowing down the JS thread but not the UI thread.
      </Text>
    </View>
  );
}

function ManyScreen() {
  const testView = useTestView();
  const a = [...Array(2000).keys()];

  return (
    <View style={viewStyle}>
      <View style={testView}>
        <Text>JS Render loop</Text>
      </View>
      <NativeTestView />
      <Text style={{ margin: 50 }}>
        Here we are rendering 2000 Text elements, slowing down the JS thread.
      </Text>
      <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap" }}>
        {a.map((i) => (
          <Text key={i}>{i}</Text>
        ))}
      </View>
    </View>
  );
}

const _LittleMemo = memo(({ content }) => <Text>{content}</Text>);
function ManyLittleMemoScreen() {
  const testView = useTestView();
  const a = [...Array(2000).keys()];

  return (
    <View style={viewStyle}>
      <View style={testView}>
        <Text>JS Render loop</Text>
      </View>
      <NativeTestView />
      <Text style={{ margin: 50 }}>
        Here we are rendering 2000 Text elements but they're each individually
        memoized with React.memo.
      </Text>
      <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap" }}>
        {a.map((i) => (
          <_LittleMemo content={i} key={i} />
        ))}
      </View>
    </View>
  );
}

const _ManyMemo = memo(() => {
  const a = [...Array(2000).keys()];
  return (
    <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap" }}>
      {a.map((i) => (
        <Text key={i}>{i}</Text>
      ))}
    </View>
  );
});

function ManyMemoScreen() {
  const testView = useTestView();
  const a = [...Array(2000).keys()];

  return (
    <View style={viewStyle}>
      <View style={testView}>
        <Text>JS Render loop</Text>
      </View>
      <NativeTestView />
      <Text style={{ margin: 50 }}>
        Here we are rendering 2000 Text elements but they are wrapped in
        React.memo making it so they do not have to recalculate on update.
      </Text>
      <_ManyMemo />
    </View>
  );
}

function ManyWithUnstableKeysScreen() {
  const testView = useTestView();
  const a = [...Array(45).keys()];

  return (
    <View style={viewStyle}>
      <View style={testView}>
        <Text>JS Render loop</Text>
      </View>
      <NativeTestView />
      <Text style={{ margin: 50 }}>
        Here we are rendering 45 elements with unstable keys, forcing the
        reconciler to update and slowing down the UI thread.
      </Text>
      <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap" }}>
        {a.map((i) => (
          <Text key={Math.random()}>{i}</Text>
        ))}
      </View>
    </View>
  );
}

function ManyWithCallbackScreen() {
  const testView = useTestView();
  const a = [...Array(100).keys()];
  const onPress = () => console.log("boop!");

  return (
    <View style={viewStyle}>
      <View style={testView}>
        <Text>JS Render loop</Text>
      </View>
      <NativeTestView />
      <Text style={{ margin: 50 }}>
        Here we are rendering a very large number of elements with an unmemoized
        callback.
      </Text>
      <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap" }}>
        {a.map((i) => (
          <Button onPress={onPress} key={i} title={i.toString()}>
            {i}
          </Button>
        ))}
      </View>
    </View>
  );
}

function ManyWithCallbackMemoizedScreen() {
  const testView = useTestView();
  const a = [...Array(100).keys()];
  const onPress = useCallback(() => console.log("boop!"), []);

  return (
    <View style={viewStyle}>
      <View style={testView}>
        <Text>JS Render loop</Text>
      </View>
      <NativeTestView />
      <Text style={{ margin: 50 }}>
        Here we are rendering a very large number of elements with a memoized
        callback.
      </Text>
      <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap" }}>
        {a.map((i) => (
          <Button onPress={onPress} key={i} title={i.toString()}>
            {i}
          </Button>
        ))}
      </View>
    </View>
  );
}

const onPress = () => console.log("boop!");
function ManyWithCallbackStaticScreen() {
  const testView = useTestView();
  const a = [...Array(100).keys()];

  return (
    <View style={viewStyle}>
      <View style={testView}>
        <Text>JS Render loop</Text>
      </View>
      <NativeTestView />
      <Text style={{ margin: 50 }}>
        Here we are rendering a very large number of elements with a memoized
        callback.
      </Text>
      <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap" }}>
        {a.map((i) => (
          <Button onPress={onPress} key={i} title={i.toString()}>
            {i}
          </Button>
        ))}
      </View>
    </View>
  );
}

function ManyWithStylesScreen() {
  const testView = useTestView();
  const a = [...Array(2000).keys()];
  const style = { fontWeight: "bold" };

  return (
    <View style={viewStyle}>
      <View style={testView}>
        <Text>JS Render loop</Text>
      </View>
      <NativeTestView />
      <Text style={{ margin: 50 }}>
        Here we are rendering a very large number of elements with an unmemoized
        styles object.
      </Text>
      <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap" }}>
        {a.map((i) => (
          <Text style={style} key={i}>
            {i}
          </Text>
        ))}
      </View>
    </View>
  );
}

function ManyWithStylesMemoizedScreen() {
  const testView = useTestView();
  const a = [...Array(2000).keys()];
  const style = useMemo(() => ({ fontWeight: "bold" }), []);

  return (
    <View style={viewStyle}>
      <View style={testView}>
        <Text>JS Render loop</Text>
      </View>
      <NativeTestView />
      <Text style={{ margin: 50 }}>
        Here we are rendering a very large number of elements with a memoized
        styles object.
      </Text>
      <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap" }}>
        {a.map((i) => (
          <Text style={style} key={i}>
            {i}
          </Text>
        ))}
      </View>
    </View>
  );
}

const style = { fontWeight: "bold" };
function ManyWithStylesStaticScreen() {
  const testView = useTestView();
  const a = [...Array(2000).keys()];

  return (
    <View style={viewStyle}>
      <View style={testView}>
        <Text>JS Render loop</Text>
      </View>
      <NativeTestView />
      <Text style={{ margin: 50 }}>
        Here we are rendering a very large number of elements with a memoized
        styles object.
      </Text>
      <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap" }}>
        {a.map((i) => (
          <Text style={style} key={i}>
            {i}
          </Text>
        ))}
      </View>
    </View>
  );
}

const withUnmounting = (Comp) => () => {
  const isFocused = useIsFocused();

  return isFocused ? <Comp /> : null;
};

const Drawer = createDrawerNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Drawer.Navigator initialRouteName="Home">
        <Drawer.Screen name="Home" component={withUnmounting(HomeScreen)} />
        <Drawer.Screen
          name="SlowComponent"
          component={withUnmounting(SlowComponentScreen)}
        />
        <Drawer.Screen name="Many" component={withUnmounting(ManyScreen)} />
        <Drawer.Screen
          name="ManyMemo"
          component={withUnmounting(ManyMemoScreen)}
        />
        <Drawer.Screen
          name="ManyLittleMemo"
          component={withUnmounting(ManyLittleMemoScreen)}
        />
        <Drawer.Screen
          name="ManyWithUnstableKeys"
          component={withUnmounting(ManyWithUnstableKeysScreen)}
        />
        <Drawer.Screen
          name="ManyWithCallback"
          component={withUnmounting(ManyWithCallbackScreen)}
        />
        <Drawer.Screen
          name="ManyWithCallbackMemoized"
          component={withUnmounting(ManyWithCallbackMemoizedScreen)}
        />
        <Drawer.Screen
          name="ManyWithCallbackStatic"
          component={withUnmounting(ManyWithCallbackStaticScreen)}
        />
        <Drawer.Screen
          name="ManyWithStyles"
          component={withUnmounting(ManyWithStylesScreen)}
        />
        <Drawer.Screen
          name="ManyWithStylesMemoized"
          component={withUnmounting(ManyWithStylesMemoizedScreen)}
        />
        <Drawer.Screen
          name="ManyWithStylesStatic"
          component={withUnmounting(ManyWithStylesStaticScreen)}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
