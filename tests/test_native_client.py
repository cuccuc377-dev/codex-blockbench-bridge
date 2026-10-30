import base64
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

source = Path(__file__).resolve().parents[1] / 'skill/blockbench-modeling/scripts/blockbench.py'
spec = importlib.util.spec_from_file_location('blockbench_client', source)
client = importlib.util.module_from_spec(spec)
spec.loader.exec_module(client)


class NativeClientTests(unittest.TestCase):
    def test_binary_export_and_overwrite_guard(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'model.stl'
            data = bytes(range(256))
            with patch.object(client.Client, 'call', return_value={'encoding': 'base64', 'content': base64.b64encode(data).decode(), 'assets': 'embedded_where_supported'}) as call:
                result = client.main(['export', 'stl', str(output)])
                self.assertEqual(output.read_bytes(), data)
                self.assertEqual(result['bytes'], len(data))
                with self.assertRaises(client.BridgeError):
                    client.main(['export', 'stl', str(output)])
                self.assertEqual(call.call_count, 1)

    def test_invalid_binary_does_not_write(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'model.glb'
            with patch.object(client.Client, 'call', return_value={'encoding': 'base64', 'content': 'not base64!', 'assets': 'embedded_where_supported'}):
                with self.assertRaises(ValueError):
                    client.main(['export', 'gltf', str(output)])
            self.assertFalse(output.exists())

    def test_layer_import_validates_png_before_request(self):
        with tempfile.TemporaryDirectory() as directory:
            image = Path(directory) / 'bad.png'
            image.write_bytes(b'not an image')
            with patch.object(client.Client, 'call') as call:
                with self.assertRaises(client.BridgeError):
                    client.main(['layer-import', 'texture-id', str(image)])
                call.assert_not_called()


if __name__ == '__main__':
    unittest.main()
