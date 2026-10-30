import importlib.util
import math
from pathlib import Path
import unittest

SCRIPTS = Path(__file__).resolve().parents[1] / "skill/blockbench-modeling/scripts"
spec = importlib.util.spec_from_file_location("primitives", SCRIPTS / "primitives.py")
primitives = importlib.util.module_from_spec(spec)
spec.loader.exec_module(primitives)


class GeometryTests(unittest.TestCase):
    def check_closed_outward(self, model):
        edges = {}
        for face in model["faces"]:
            self.assertEqual(len(face), len(set(face)))
            a, b, c = [model["vertices"][key] for key in face[:3]]
            u, v = [[q[i] - a[i] for i in range(3)] for q in (b, c)]
            n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
            center = [sum(model["vertices"][key][i] for key in face)/len(face) for i in range(3)]
            self.assertGreater(sum(n[i]*center[i] for i in range(3)), 0, face)
            for start, end in zip(face, face[1:]+face[:1]):
                key = tuple(sorted((start,end)))
                edges.setdefault(key, []).append((start,end))
        for edge in edges.values():
            self.assertEqual(len(edge), 2)
            self.assertEqual(edge[0], tuple(reversed(edge[1])))

    def test_cylinder(self):
        self.check_closed_outward(primitives.cylinder(4,8,12))

    def test_cone(self):
        self.check_closed_outward(primitives.cylinder(4,8,12,0))

    def test_sphere(self):
        self.check_closed_outward(primitives.sphere(4,12,6))


if __name__ == "__main__":
    unittest.main()
