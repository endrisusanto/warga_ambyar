package com.example.warga_ambyar_mobile

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.SharedPreferences
import android.widget.RemoteViews

class WargaAmbyarWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        val prefs: SharedPreferences = context.getSharedPreferences(
            "warga_ambyar_widget_prefs",
            Context.MODE_PRIVATE
        )

        val saldo = prefs.getString("saldo_kas", "Rp 0") ?: "Rp 0"
        val rondaTanggal = prefs.getString("ronda_tanggal", "-") ?: "-"
        val rondaPetugas = prefs.getString("ronda_petugas", "Tidak ada jadwal") ?: "Tidak ada jadwal"
        val pengumuman = prefs.getString("pengumuman_info", "Tidak ada pengumuman baru") ?: "Tidak ada pengumuman baru"

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_layout)
            
            views.setTextViewText(R.id.txt_saldo, saldo)
            views.setTextViewText(R.id.txt_ronda_tanggal, rondaTanggal)
            views.setTextViewText(R.id.txt_ronda_petugas, rondaPetugas)
            views.setTextViewText(R.id.txt_pengumuman, pengumuman)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
