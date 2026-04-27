import 'package:flutter/material.dart';

class VoddaAppBarTitle extends StatelessWidget {
  final String title;

  const VoddaAppBarTitle(
    this.title, {
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Image.asset(
          'assets/images/logo.png',
          height: 28,
          width: 28,
        ),
        const SizedBox(width: 10),
        Flexible(
          child: Text(
            title,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
