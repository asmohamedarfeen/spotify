import unittest

from recommendation_logic import normalize_recommendation


class RecommendationLogicTest(unittest.TestCase):
    def test_normalize_recommendation_scores_and_shapes_track(self):
        track = {
            "videoId": "abc123",
            "title": "Night Drive Remix",
            "artists": [{"name": "Local Artist"}],
            "album": {"name": "Single"},
            "thumbnails": [{"url": "small.jpg"}, {"url": "large.jpg"}],
        }

        result = normalize_recommendation(track, "watch-playlist", 0, "Night Drive", "Local Artist")

        self.assertEqual(result["videoId"], "abc123")
        self.assertEqual(result["artist"], "Local Artist")
        self.assertEqual(result["thumbnail"], "large.jpg")
        self.assertGreaterEqual(result["matchPercentage"], 58)
        self.assertEqual(result["recommendationSource"], "watch-playlist")


if __name__ == "__main__":
    unittest.main()
