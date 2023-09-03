package cn.toside.music.mobile;

import android.app.AppOpsManager;
import android.app.Instrumentation;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.view.KeyEvent;

import androidx.annotation.Nullable;

import com.facebook.react.ReactRootView;
import com.reactnativenavigation.NavigationActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultReactActivityDelegate;

import java.util.List;
import java.util.TreeMap;

public class MainActivity extends NavigationActivity {
  public static boolean startFromLauncher = false;

  public static class MainActivityDelegate extends ReactActivityDelegate {
    public MainActivityDelegate(NavigationActivity activity, String mainComponentName) {
      super(activity, mainComponentName);
    }

    @Override
    protected ReactRootView createRootView() {
      ReactRootView reactRootView = new ReactRootView(getContext());
      // If you opted-in for the New Architecture, we enable the Fabric Renderer.
      reactRootView.setIsFabric(BuildConfig.IS_NEW_ARCHITECTURE_ENABLED);
      return reactRootView;
    }

    @Override
    protected boolean isConcurrentRootEnabled() {
      // If you opted-in for the New Architecture, we enable Concurrent Root (i.e. React 18).
      // More on this on https://reactjs.org/blog/2022/03/29/react-v18.html
      return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
    }
  }

  @Override
  protected void onCreate(@Nullable Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // TODO 注意这里需要先手动给一下查看使用情况的权限。比亚迪车机上不让自动打开获取权限的窗口，需要通过adb获取
    // adb shell appops set cn.toside.music.mobile android:get_usage_stats allow
    // 不行的话试试 adb shell pm grant cn.toside.music.mobile android.permission.PACKAGE_USAGE_STATS
    // 再不行的话就放弃吧，不加权限查不到数据，默认不是从桌面打开，也就是首次点开app必定会隐藏界面，需要再点一次

    UsageStatsManager mUsageStatsManager = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
    long time = System.currentTimeMillis();
    List<UsageStats> stats ;
    stats = mUsageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, time - 30000, time);

    Log.d("GetTopPackage", "query usage...");
    // Sort the stats by the last time used
    String topPackageName = "";
    if(stats != null) {
      TreeMap<Long,UsageStats> mySortedMap = new TreeMap<Long,UsageStats>();
      for (UsageStats usageStats : stats) {
        if (usageStats.getLastTimeUsed() == 0 || usageStats.getPackageName().equals(getPackageName())) {
          // 自己包名或者没有时间的跳过
          continue;
        }
        mySortedMap.put(usageStats.getLastTimeUsed(), usageStats);
        Log.d("GetTopPackage", usageStats.getPackageName() + ": " + usageStats.getLastTimeUsed());
      }
      if(!mySortedMap.isEmpty()) {
        topPackageName = mySortedMap.get(mySortedMap.lastKey()).getPackageName();
        String launcher = getLauncherPackageName();
        Log.d("GetTopPackage", "top package:" + topPackageName + ", launcher: " + launcher);
        // 是否从桌面启动，记录下这个信息，后续方便处理（隐藏窗口）
        MainActivity.startFromLauncher = topPackageName.equals(launcher);
      }
    }
  }

  private String getLauncherPackageName() {
    final Intent intent = new Intent(Intent.ACTION_MAIN);
    intent.addCategory(Intent.CATEGORY_HOME);
    final ResolveInfo res = getPackageManager().resolveActivity(intent, 0);
    if (res.activityInfo == null) {
      // should not happen. A home is always installed, isn't it?
      return null;
    }
    if (res.activityInfo.packageName.equals("android")) {
      // 有多个桌面程序存在，且未指定默认项时；
      return null;
    } else {
      return res.activityInfo.packageName;
    }
  }

  /**
   * Returns the instance of the {@link ReactActivityDelegate}. Here we use a util class {@link
   * DefaultReactActivityDelegate} which allows you to easily enable Fabric and Concurrent React
   * (aka React 18) with two boolean flags.
   */
  // @Override
  // protected ReactActivityDelegate createReactActivityDelegate() {
  //   return new DefaultReactActivityDelegate(
  //       this,
  //       getMainComponentName(),
  //       // If you opted-in for the New Architecture, we enable the Fabric Renderer.
  //       DefaultNewArchitectureEntryPoint.getFabricEnabled(), // fabricEnabled
  //       // If you opted-in for the New Architecture, we enable Concurrent React (i.e. React 18).
  //       DefaultNewArchitectureEntryPoint.getConcurrentReactEnabled() // concurrentRootEnabled
  //       );
  // }
}
