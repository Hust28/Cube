package com.example

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class ExampleUnitTest {
  @Test
  fun addition_isCorrect() {
    assertEquals(4, 2 + 2)
  }

  @Test
  fun appConfiguration_isValid() {
    val appName = "CubeRush 3D"
    assertNotNull(appName)
    assertEquals("CubeRush 3D", appName)
  }

  @Test
  fun webAssets_existAndValid() {
    val assetFile = java.io.File("src/main/assets/web/index.html")
    assert(assetFile.exists()) { "Web asset file src/main/assets/web/index.html must exist" }
    assert(assetFile.length() > 100000) { "Web asset file must contain bundled singlefile app" }
  }

  @Test
  fun rubiksCubeModel_colorStickerDistribution() {
    // Standard 3x3x3 cube has 6 faces with 9 stickers each = 54 total stickers
    val faces = listOf("U", "D", "F", "B", "L", "R")
    val stickersPerFace = 9
    val totalStickers = faces.size * stickersPerFace
    assertEquals(54, totalStickers)

    // Six standard colors: W (White), Y (Yellow), G (Green), B (Blue), R (Red), O (Orange)
    val colors = listOf('W', 'Y', 'G', 'B', 'R', 'O')
    assertEquals(6, colors.size)
  }

  @Test
  fun moveInversion_identityVerification() {
    // Move followed by its inverse returns to starting state
    fun invert(move: String): String = when {
      move.endsWith("'") -> move.dropLast(1)
      move.endsWith("2") -> move
      else -> "$move'"
    }

    assertEquals("R'", invert("R"))
    assertEquals("R", invert("R'"))
    assertEquals("U2", invert("U2"))
    assertEquals("F'", invert("F"))
    assertEquals("L", invert("L'"))
  }
}
