package com.example.warga_ambyar_mobile

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.SharedPreferences
import android.widget.RemoteViews
import com.example.warga_ambyar_mobile.R

// ponytail: keep widget updates dead-simple, reading values from HomeWidget Shared Preferences
class WargaAmbyarWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        val prefs: SharedPreferences = context.getSharedPreferences(
            "DATA_WIDGET_NAME_group.com.example.warga_ambyar", // Shared Preferences namespace used by home_widget
            Context.MODE_PRIVATE
        )

        val saldo = prefs.getString("saldo_kas", "Rp 0") ?: "Rp 0"
        val rondaTanggal = prefs.getString("ronda_tanggal", "-") ?: "-"
        val rondaPetugas = prefs.getString("ronda_petugas", "Tidak ada jadwal") ?: "Tidak ada jadwal"
        val pengumuman = prefs.getString("pengumuman_info", "Tidak ada pengumuman baru") ?: "Tidak ada pengumuman baru"

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_layout)
            
            // Set text values in layout RemoteViews
            views.setTextViewText(R.id.txt_saldo, saldo)
            views.setTextViewText(R.id.txt_ronda_tanggal, rondaTanggal)
            views.setTextViewText(R.id.txt_ronda_petugas, rondaPetugas)
            views.setTextViewText(R.id.txt_pengumuman, pengumuman)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
