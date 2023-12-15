package com.victorsu.runapp

import android.app.Activity
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import kotlin.system.exitProcess


class MainActivity : Activity() {
    private val packname = "cn.toside.music.mobile"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val packageList = packageManager.getInstalledPackages(PackageManager.GET_PERMISSIONS)

        for (packageInfo in packageList) {
            Log.d("Package Name:", packageInfo.packageName)
        }

        if (checkPackInfo()) {
            val intent = packageManager.getLaunchIntentForPackage(packname)
            startActivity(intent)
            Toast.makeText(this@MainActivity, "成功打开$packname", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(this@MainActivity, "没有安装$packname", Toast.LENGTH_SHORT).show()
        }

        finish()
        android.os.Process.killProcess(android.os.Process.myPid())
        exitProcess(0)
    }

    private fun checkPackInfo(): Boolean {
        var packageInfo: PackageInfo? = null
        try {
            packageInfo = packageManager.getPackageInfo(packname, 0)
        } catch (e: PackageManager.NameNotFoundException) {
            e.printStackTrace()
        }
        return packageInfo != null
    }
}
