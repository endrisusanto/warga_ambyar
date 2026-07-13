package com.example.warga_ambyar_mobile

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.google.gson.annotations.SerializedName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*

// ==========================================
// DATA MODELS
// ==========================================
data class LoginRequest(val username: String, val password: String)
data class ApiResponse<T>(val success: Boolean, val message: String?, val data: T)

data class UserData(
    val id: Int,
    val username: String,
    val role: String,
    @SerializedName("warga_id") val wargaId: Int
)

data class WidgetData(
    @SerializedName("saldo_kas") val saldoKas: String,
    @SerializedName("jadwal_ronda") val jadwalRonda: RondaSummary,
    val pengumuman: List<EventData>
)

data class RondaSummary(
    @SerializedName("is_upcoming") val isUpcoming: Boolean,
    val tanggal: String,
    val petugas: List<String>
)

data class EventData(
    val id: Int,
    val judul: String,
    val deskripsi: String,
    val tanggal: String,
    val lokasi: String
)

data class KeuanganData(
    val saldo: String,
    val pemasukan: String,
    val pengeluaran: String,
    val transaksi: List<TransaksiData>
)

data class TransaksiData(
    val id: Int,
    val tipe: String,
    val jumlah: String,
    val keterangan: String,
    val tanggal: String
)

data class RondaData(
    @SerializedName("ronda_hari_ini") val rondaHariIni: List<PetugasData>,
    @SerializedName("jadwal_bulanan") val jadwalBulanan: List<PetugasData>
)

data class PetugasData(
    val id: Int,
    val tanggal: String?,
    val nama: String,
    val blok: String,
    val nomor_rumah: String,
    val status: String
)

data class CctvData(
    @SerializedName("cctv_lokal") val cctvLokal: List<CameraLink>,
    @SerializedName("cctv_lalu_lintas") val cctvLaluLintas: List<CameraLink>
)

data class CameraLink(
    val id: String,
    val name: String,
    val url: String
)

data class PengaduanData(
    val id: Int,
    val judul: String,
    val deskripsi: String,
    val status: String,
    val tanggapan: String?,
    @SerializedName("nama_warga") val namaWarga: String,
    val blok: String,
    @SerializedName("nomor_rumah") val nomorRumah: String,
    @SerializedName("created_at") val createdAt: String
)

data class AddPengaduanRequest(
    @SerializedName("warga_id") val wargaId: Int,
    val judul: String,
    val deskripsi: String,
    @SerializedName("is_anonim") val isAnonim: Boolean
)

// ==========================================
// RETROFIT API INTERFACE
// ==========================================
interface WargaAmbyarApi {
    @POST("api/auth/login")
    suspend fun login(
        @Header("x-api-key") apiKey: String,
        @Body request: LoginRequest
    ): ApiResponse<UserData>

    @GET("api/widget-data")
    suspend fun getWidgetData(
        @Header("x-api-key") apiKey: String
    ): ApiResponse<WidgetData>

    @GET("api/keuangan")
    suspend fun getKeuangan(
        @Header("x-api-key") apiKey: String
    ): ApiResponse<KeuanganData>

    @GET("api/ronda")
    suspend fun getRonda(
        @Header("x-api-key") apiKey: String
    ): ApiResponse<RondaData>

    @GET("api/cctv")
    suspend fun getCctv(
        @Header("x-api-key") apiKey: String
    ): ApiResponse<CctvData>

    @GET("api/pengaduan")
    suspend fun getPengaduan(
        @Header("x-api-key") apiKey: String
    ): ApiResponse<List<PengaduanData>>

    @POST("api/pengaduan")
    suspend fun addPengaduan(
        @Header("x-api-key") apiKey: String,
        @Body request: AddPengaduanRequest
    ): ApiResponse<Map<String, Any>>
}

// ==========================================
// HELPER FOR RETROFIT CLIENT
// ==========================================
object ApiClient {
    private var retrofit: Retrofit? = null

    fun getClient(baseUrl: String): WargaAmbyarApi {
        val sanitizedUrl = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        if (retrofit == null || retrofit?.baseUrl().toString() != sanitizedUrl) {
            retrofit = Retrofit.Builder()
                .baseUrl(sanitizedUrl)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }
        return retrofit!!.create(WargaAmbyarApi::class.java)
    }
}

// ==========================================
// MAIN ACTIVITY (JETPACK COMPOSE ENTRYPOINT)
// ==========================================
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = darkColorScheme(
                primary = Color(0xFF9F52FF),
                secondary = Color(0xFF03DAC5),
                background = Color(0xFF151221),
                surface = Color(0xFF221F35)
            )) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavigation()
                }
            }
        }
    }
}

// ==========================================
// APP NAVIGATION HOST
// ==========================================
@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = "login") {
        composable("login") { LoginScreen(navController) }
        composable("dashboard") { DashboardScreen(navController) }
        composable("keuangan") { KeuanganScreen(navController) }
        composable("ronda") { RondaScreen(navController) }
        composable("cctv") { CctvScreen(navController) }
        composable("pengaduan") { PengaduanScreen(navController) }
    }
}

// ==========================================
// 1. LOGIN SCREEN
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(navController: NavController) {
    val context = navController.context
    val sharedPrefs = context.getSharedPreferences("warga_ambyar_prefs", Context.MODE_PRIVATE)
    
    var serverUrl by remember { mutableStateOf(sharedPrefs.getString("server_url", "https://gang.ambyar.biz.id") ?: "https://gang.ambyar.biz.id") }
    var apiKey by remember { mutableStateOf(sharedPrefs.getString("api_key", "warga_ambyar_widget_secret_key") ?: "warga_ambyar_widget_secret_key") }
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Warga Ambyar Mobile", fontSize = 26.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
        Spacer(modifier = Modifier.height(8.dp))
        Text("Masuk menggunakan akun RT/RW Anda", fontSize = 14.sp, color = Color.Gray)
        Spacer(modifier = Modifier.height(32.dp))

        OutlinedTextField(
            value = serverUrl,
            onValueChange = { serverUrl = it },
            label = { Text("URL Server Backend") },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = apiKey,
            onValueChange = { apiKey = it },
            label = { Text("Widget API Key") },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = username,
            onValueChange = { username = it },
            label = { Text("Username") },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth()
        )
        
        if (errorMessage.isNotEmpty()) {
            Spacer(modifier = Modifier.height(16.dp))
            Text(errorMessage, color = Color.Red, fontSize = 14.sp)
        }

        Spacer(modifier = Modifier.height(32.dp))
        Button(
            onClick = {
                isLoading = true
                errorMessage = ""
                // Simpan pengaturan serverUrl dan apiKey
                sharedPrefs.edit()
                    .putString("server_url", serverUrl)
                    .putString("api_key", apiKey)
                    .apply()

                val api = ApiClient.getClient(serverUrl)
                CoroutineScope(Dispatchers.IO).launch {
                    try {
                        val response = api.login(apiKey, LoginRequest(username, password))
                        withContext(Dispatchers.Main) {
                            isLoading = false
                            if (response.success) {
                                sharedPrefs.edit()
                                    .putInt("warga_id", response.data.wargaId)
                                    .putString("username", response.data.username)
                                    .putString("role", response.data.role)
                                    .apply()
                                navController.navigate("dashboard") {
                                    popUpTo("login") { inclusive = true }
                                }
                            } else {
                                errorMessage = response.message ?: "Login gagal"
                            }
                        }
                    } catch (e: Exception) {
                        withContext(Dispatchers.Main) {
                            isLoading = false
                            errorMessage = "Koneksi gagal: ${e.localizedMessage}"
                        }
                    }
                }
            },
            enabled = !isLoading && username.isNotEmpty() && password.isNotEmpty(),
            modifier = Modifier.fillMaxWidth().height(50.dp)
        ) {
            if (isLoading) {
                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
            } else {
                Text("MASUK")
            }
        }
    }
}

// ==========================================
// 2. DASHBOARD SCREEN
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(navController: NavController) {
    val context = navController.context
    val sharedPrefs = context.getSharedPreferences("warga_ambyar_prefs", Context.MODE_PRIVATE)
    val serverUrl = sharedPrefs.getString("server_url", "https://gang.ambyar.biz.id") ?: "https://gang.ambyar.biz.id"
    val apiKey = sharedPrefs.getString("api_key", "warga_ambyar_widget_secret_key") ?: "warga_ambyar_widget_secret_key"
    
    var saldoKas by remember { mutableStateOf("Rp 0") }
    var rondaTanggal by remember { mutableStateOf("-") }
    var rondaPetugas by remember { mutableStateOf("Tidak ada petugas") }
    var pengumumanList by remember { mutableStateOf<List<EventData>>(emptyList()) }
    var isSyncing by remember { mutableStateOf(false) }
    var statusText by remember { mutableStateOf("Menunggu sinkronisasi...") }

    val syncDataAndWidget = {
        isSyncing = true
        statusText = "Sinkronisasi..."
        val api = ApiClient.getClient(serverUrl)
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = api.getWidgetData(apiKey)
                withContext(Dispatchers.Main) {
                    isSyncing = false
                    if (response.success) {
                        val data = response.data
                        
                        val saldoNum = data.saldoKas.toDoubleOrNull() ?: 0.0
                        saldoKas = "Rp " + String.format("%,.0f", saldoNum).replace(',', '.')
                        
                        rondaTanggal = if (data.jadwalRonda.isUpcoming) "Jadwal Terdekat: ${data.jadwalRonda.tanggal}" else "Malam Ini"
                        rondaPetugas = if (data.jadwalRonda.petugas.isEmpty()) "Tidak ada jadwal" else data.jadwalRonda.petugas.joinToString(", ")
                        
                        pengumumanList = data.pengumuman
                        statusText = "Data Widget Terkini!"
                        
                        // ponytail: simpan data untuk dibaca oleh widget native
                        val widgetPrefs = context.getSharedPreferences("warga_ambyar_widget_prefs", Context.MODE_PRIVATE)
                        widgetPrefs.edit()
                            .putString("saldo_kas", saldoKas)
                            .putString("ronda_tanggal", rondaTanggal)
                            .putString("ronda_petugas", rondaPetugas)
                            .putString("pengumuman_info", if (pengumumanList.isEmpty()) "Tidak ada pengumuman baru" else pengumumanList.map { "• ${it.judul}" }.joinToString("\n"))
                            .apply()
                        
                        // Trigger Widget update
                        val intent = Intent(context, WargaAmbyarWidgetProvider::class.java).apply {
                            action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                            val ids = AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, WargaAmbyarWidgetProvider::class.java))
                            putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
                        }
                        context.sendBroadcast(intent)
                    } else {
                        statusText = "Gagal memuat data"
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    isSyncing = false
                    statusText = "Koneksi gagal"
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        syncDataAndWidget()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Dashboard Warga Ambyar") },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
                actions = {
                    IconButton(onClick = { syncDataAndWidget() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Sync")
                    }
                }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertizontally
                ) {
                    Text("Halo, ${sharedPrefs.getString("username", "Warga")}", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Text(statusText, fontSize = 12.sp, color = Color.Gray)
                }
            }

            // CARD SALDO KAS
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0x334CAF50)),
                    modifier = Modifier.fillMaxWidth().clickable { navController.navigate("keuangan") }
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertizontally
                    ) {
                        Icon(Icons.Default.AccountBalanceWallet, contentDescription = "Kas", tint = Color.Green, modifier = Modifier.size(48.dp))
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Text("Saldo Kas RT", fontSize = 14.sp)
                            Text(saldoKas, fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }

            // CARD JADWAL RONDA
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0x332196F3)),
                    modifier = Modifier.fillMaxWidth().clickable { navController.navigate("ronda") }
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertizontally) {
                            Icon(Icons.Default.Security, contentDescription = "Ronda", tint = Color.Blue)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Jadwal Ronda - $rondaTanggal", fontWeight = FontWeight.Bold)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(rondaPetugas, fontSize = 16.sp)
                    }
                }
            }

            // MENU SHORTCUTS GRID
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Card(
                        modifier = Modifier.weight(1f).height(100.dp).clickable { navController.navigate("cctv") },
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.Center,
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(Icons.Default.Videocam, contentDescription = "CCTV", tint = MaterialTheme.colorScheme.primary, size = 32.dp)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("Stream CCTV")
                        }
                    }
                    Card(
                        modifier = Modifier.weight(1f).height(100.dp).clickable { navController.navigate("pengaduan") },
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.Center,
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(Icons.Default.Campaign, contentDescription = "Pengaduan", tint = Color.Orange, size = 32.dp)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("Pengaduan")
                        }
                    }
                }
            }

            // CARD PENGUMUMAN
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0x33FF9800)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertizontally) {
                            Icon(Icons.Default.Campaign, contentDescription = "Pengumuman", tint = Color.Orange)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Pengumuman / Agenda", fontWeight = FontWeight.Bold)
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        if (pengumumanList.isEmpty()) {
                            Text("Tidak ada pengumuman terbaru")
                        } else {
                            pengumumanList.forEach { event ->
                                Column(modifier = Modifier.padding(vertical = 4.dp)) {
                                    Text(event.judul, fontWeight = FontWeight.Bold, color = Color.White)
                                    Text("${event.tanggal} - ${event.lokasi}", fontSize = 12.sp, color = Color.LightGray)
                                    Text(event.deskripsi, fontSize = 13.sp, color = Color.Gray)
                                    Divider(color = Color.White.copy(alpha = 0.1f), modifier = Modifier.padding(vertical = 4.dp))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ==========================================
// 3. KEUANGAN SCREEN
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KeuanganScreen(navController: NavController) {
    val context = navController.context
    val sharedPrefs = context.getSharedPreferences("warga_ambyar_prefs", Context.MODE_PRIVATE)
    val serverUrl = sharedPrefs.getString("server_url", "") ?: ""
    val apiKey = sharedPrefs.getString("api_key", "") ?: ""

    var data by remember { mutableStateOf<KeuanganData?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        val api = ApiClient.getClient(serverUrl)
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = api.getKeuangan(apiKey)
                withContext(Dispatchers.Main) {
                    isLoading = false
                    if (response.success) {
                        data = response.data
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { isLoading = false }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Buku Kas Keuangan") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                }
            )
        }
    ) { paddingValues ->
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Header Kas
                data?.let { kd ->
                    item {
                        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                            Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                                Text("Total Saldo Sekarang", fontSize = 12.sp, color = Color.Gray)
                                Text("Rp " + String.format("%,.0f", kd.saldo.toDoubleOrNull() ?: 0.0).replace(',', '.'), fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Color.Green)
                                Spacer(modifier = Modifier.height(16.dp))
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Column {
                                        Text("Total Pemasukan", fontSize = 11.sp, color = Color.Gray)
                                        Text("+Rp " + String.format("%,.0f", kd.pemasukan.toDoubleOrNull() ?: 0.0).replace(',', '.'), color = Color.Green, fontWeight = FontWeight.Bold)
                                    }
                                    Column {
                                        Text("Total Pengeluaran", fontSize = 11.sp, color = Color.Gray)
                                        Text("-Rp " + String.format("%,.0f", kd.pengeluaran.toDoubleOrNull() ?: 0.0).replace(',', '.'), color = Color.Red, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }

                    // Riwayat Transaksi
                    item {
                        Text("Riwayat Transaksi", fontSize = 16.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(vertical = 8.dp))
                    }

                    items(kd.transaksi) { tx ->
                        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.5f))) {
                            Row(modifier = Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertizontally) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(tx.keterangan, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    Text(tx.tanggal, fontSize = 12.sp, color = Color.Gray)
                                }
                                val isMasuk = tx.tipe == "masuk"
                                Text(
                                    text = (if (isMasuk) "+" else "-") + "Rp " + String.format("%,.0f", tx.jumlah.toDoubleOrNull() ?: 0.0).replace(',', '.'),
                                    color = if (isMasuk) Color.Green else Color.Red,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// ==========================================
// 4. RONDA SCREEN
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RondaScreen(navController: NavController) {
    val context = navController.context
    val sharedPrefs = context.getSharedPreferences("warga_ambyar_prefs", Context.MODE_PRIVATE)
    val serverUrl = sharedPrefs.getString("server_url", "") ?: ""
    val apiKey = sharedPrefs.getString("api_key", "") ?: ""

    var data by remember { mutableStateOf<RondaData?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        val api = ApiClient.getClient(serverUrl)
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = api.getRonda(apiKey)
                withContext(Dispatchers.Main) {
                    isLoading = false
                    if (response.success) {
                        data = response.data
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { isLoading = false }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Jadwal Ronda Malam") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                }
            )
        }
    ) { paddingValues ->
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Ronda Hari Ini
                item {
                    Text("Petugas Ronda Hari Ini / Terdekat", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }

                data?.rondaHariIni?.let { list ->
                    if (list.isEmpty()) {
                        item { Text("Tidak ada petugas ronda hari ini.", color = Color.Gray, fontSize = 14.sp) }
                    } else {
                        items(list) { petugas ->
                            Card(colors = CardDefaults.cardColors(containerColor = Color(0x332196F3))) {
                                Row(modifier = Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Column {
                                        Text(petugas.nama, fontWeight = FontWeight.Bold)
                                        Text("Rumah: Blok ${petugas.blok} No. ${petugas.nomor_rumah}", fontSize = 12.sp, color = Color.LightGray)
                                    }
                                    Badge(containerColor = Color.Blue) {
                                        Text(petugas.status.uppercase(), color = Color.White, modifier = Modifier.padding(4.dp))
                                    }
                                }
                            }
                        }
                    }
                }

                // Jadwal Bulanan mendatang
                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Jadwal Ronda Mendatang (Bulan Ini)", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }

                data?.jadwalBulanan?.let { list ->
                    if (list.isEmpty()) {
                        item { Text("Belum ada jadwal yang di-generate.", color = Color.Gray) }
                    } else {
                        items(list) { s ->
                            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                                Row(modifier = Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertizontally) {
                                    Column {
                                        Text(s.nama, fontWeight = FontWeight.Bold)
                                        Text("Blok ${s.blok} No. ${s.nomor_rumah}", fontSize = 12.sp, color = Color.Gray)
                                    }
                                    Text(s.tanggal ?: "", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ==========================================
// 5. CCTV SCREEN
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CctvScreen(navController: NavController) {
    val context = navController.context
    val sharedPrefs = context.getSharedPreferences("warga_ambyar_prefs", Context.MODE_PRIVATE)
    val serverUrl = sharedPrefs.getString("server_url", "") ?: ""
    val apiKey = sharedPrefs.getString("api_key", "") ?: ""

    var data by remember { mutableStateOf<CctvData?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        val api = ApiClient.getClient(serverUrl)
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = api.getCctv(apiKey)
                withContext(Dispatchers.Main) {
                    isLoading = false
                    if (response.success) {
                        data = response.data
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { isLoading = false }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Stream CCTV Warga") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                }
            )
        }
    ) { paddingValues ->
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Text("CCTV Lokal Gang Ambyar", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }

                data?.cctvLokal?.let { list ->
                    items(list) { cam ->
                        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                            Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                                Text(cam.name, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                Text(cam.id, fontSize = 11.sp, color = Color.Gray)
                                Spacer(modifier = Modifier.height(8.dp))
                                // Simulating video feed via loading image url or button
                                Button(
                                    onClick = {
                                        // Open stream URL in external browser/player
                                        val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(cam.url))
                                        context.startActivity(intent)
                                    },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Icon(Icons.Default.PlayArrow, contentDescription = "Play")
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Buka Stream Live")
                                }
                            }
                        }
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("CCTV Lalu Lintas Umum", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }

                data?.cctvLaluLintas?.let { list ->
                    items(list) { cam ->
                        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.5f))) {
                            Column(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
                                Text(cam.name, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text("Streaming ID: ${cam.id}", fontSize = 11.sp, color = Color.Gray)
                                Spacer(modifier = Modifier.height(8.dp))
                                Button(
                                    onClick = {
                                        val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(cam.url))
                                        context.startActivity(intent)
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.6f)),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("Buka HLS stream")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ==========================================
// 6. PENGADUAN SCREEN
// ==========================================
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PengaduanScreen(navController: NavController) {
    val context = navController.context
    val sharedPrefs = context.getSharedPreferences("warga_ambyar_prefs", Context.MODE_PRIVATE)
    val serverUrl = sharedPrefs.getString("server_url", "") ?: ""
    val apiKey = sharedPrefs.getString("api_key", "") ?: ""
    val wargaId = sharedPrefs.getInt("warga_id", 0)

    var listComplaints by remember { mutableStateOf<List<PengaduanData>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    
    // Add complaint state
    var showAddDialog by remember { mutableStateOf(false) }
    var judul by remember { mutableStateOf("") }
    var deskripsi by remember { mutableStateOf("") }
    var isAnonim by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }

    val fetchComplaints = {
        isLoading = true
        val api = ApiClient.getClient(serverUrl)
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val response = api.getPengaduan(apiKey)
                withContext(Dispatchers.Main) {
                    isLoading = false
                    if (response.success) {
                        listComplaints = response.data
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { isLoading = false }
            }
        }
    }

    LaunchedEffect(Unit) {
        fetchComplaints()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Pengaduan Warga") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddDialog = true }) {
                Icon(Icons.Default.Add, contentDescription = "Tambah Aduan")
            }
        }
    ) { paddingValues ->
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (listComplaints.isEmpty()) {
                    item {
                        Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                            Text("Tidak ada aduan warga saat ini.", color = Color.Gray)
                        }
                    }
                } else {
                    items(listComplaints) { c ->
                        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                            Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    val pengirim = if (c.isAnonim) "Anonim" else c.namaWarga
                                    Text(pengirim, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                    
                                    val statusColor = when (c.status.lowercase()) {
                                        "selesai" -> Color.Green
                                        "proses" -> Color.Yellow
                                        else -> Color.Red
                                    }
                                    Text(c.status.uppercase(), color = statusColor, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }
                                Text("Blok ${c.blok} No. ${c.nomorRumah} • ${c.createdAt}", fontSize = 11.sp, color = Color.Gray)
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(c.judul, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(c.deskripsi, fontSize = 14.sp)
                                
                                c.tanggapan?.let { tangg ->
                                    if (tangg.trim().isNotEmpty()) {
                                        Spacer(modifier = Modifier.height(12.dp))
                                        Card(colors = CardDefaults.cardColors(containerColor = Color(0x22FFFFFF))) {
                                            Column(modifier = Modifier.padding(12.dp)) {
                                                Text("Tanggapan Pengurus:", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.Green)
                                                Text(tangg, fontSize = 13.sp, color = Color.LightGray)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // ADD COMPLAINT DIALOG
        if (showAddDialog) {
            AlertDialog(
                onDismissRequest = { if (!isSubmitting) showAddDialog = false },
                title = { Text("Buat Pengaduan Baru") },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedTextField(
                            value = judul,
                            onValueChange = { judul = it },
                            label = { Text("Judul Aduan") },
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = deskripsi,
                            onValueChange = { deskripsi = it },
                            label = { Text("Deskripsi / Detail Masalah") },
                            modifier = Modifier.fillMaxWidth().height(120.dp)
                        )
                        Row(verticalAlignment = Alignment.CenterVertizontally) {
                            Checkbox(checked = isAnonim, onCheckedChange = { isAnonim = it })
                            Text("Kirim sebagai Anonim")
                        }
                    }
                },
                confirmButton = {
                    Button(
                        enabled = !isSubmitting && judul.isNotEmpty() && deskripsi.isNotEmpty(),
                        onClick = {
                            isSubmitting = true
                            val api = ApiClient.getClient(serverUrl)
                            CoroutineScope(Dispatchers.IO).launch {
                                try {
                                    val response = api.addPengaduan(apiKey, AddPengaduanRequest(wargaId, judul, deskripsi, isAnonim))
                                    withContext(Dispatchers.Main) {
                                        isSubmitting = false
                                        if (response.success) {
                                            judul = ""
                                            deskripsi = ""
                                            isAnonim = false
                                            showAddDialog = false
                                            fetchComplaints()
                                        }
                                    }
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) { isSubmitting = false }
                                }
                            }
                        }
                    ) {
                        Text("KIRIM")
                    }
                },
                dismissButton = {
                    TextButton(
                        enabled = !isSubmitting,
                        onClick = { showAddDialog = false }
                    ) {
                        Text("BATAL")
                    }
                }
            )
        }
    }
}
